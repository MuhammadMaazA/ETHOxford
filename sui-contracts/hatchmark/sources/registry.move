/// Hatchmark Registry — on-chain content authenticity for the provenance economy.
///
/// Creators register perceptual image hashes as owned objects on Sui.
/// Anyone can flag suspect content by staking SUI, creating a transparent dispute record.
/// Only the original creator may resolve a dispute.
/// If the dispute is valid (infringement confirmed), stake is returned to the flagger.
/// If the dispute is invalid (false flag), stake is forfeited to the content creator.
module hatchmark::registry {
    // ═══════════════════════════════════════════════════════════════════
    // Imports
    // ═══════════════════════════════════════════════════════════════════
    use sui::event;
    use sui::clock::Clock;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use std::string::String;

    // ═══════════════════════════════════════════════════════════════════
    // Error codes
    // ═══════════════════════════════════════════════════════════════════
    const ENotCreator: u64 = 0;
    const EInvalidHash: u64 = 1;
    const EDisputeAlreadyResolved: u64 = 2;
    const EInvalidResolution: u64 = 3;
    const EInsufficientStake: u64 = 4;

    // ═══════════════════════════════════════════════════════════════════
    // Staking constants
    // ═══════════════════════════════════════════════════════════════════
    /// Minimum stake required to file a dispute (0.1 SUI = 100_000_000 MIST)
    const MINIMUM_STAKE: u64 = 100_000_000;

    // ═══════════════════════════════════════════════════════════════════
    // Dispute status constants
    // ═══════════════════════════════════════════════════════════════════
    const STATUS_OPEN: u8 = 0;
    const STATUS_VALID: u8 = 1;
    const STATUS_INVALID: u8 = 2;

    // ═══════════════════════════════════════════════════════════════════
    // Objects
    // ═══════════════════════════════════════════════════════════════════

    /// A certificate proving that a creator registered a specific image hash
    /// on-chain at a given point in time.  Owned by the creator.
    public struct RegistrationCertificate has key, store {
        id: UID,
        /// 32-byte perceptual hash of the image
        image_hash: vector<u8>,
        /// Address of the creator who registered
        creator: address,
        /// On-chain timestamp (ms) from Sui Clock
        timestamp: u64,
        /// Human-readable title
        title: String,
        /// Optional description / metadata
        description: String,
    }

    /// A dispute raised against a registered certificate.
    /// Created by the flagger (shared object so both parties can interact).
    /// Holds a SUI stake that is distributed on resolution.
    public struct Dispute has key, store {
        id: UID,
        /// Object ID of the certificate being disputed
        original_cert_id: ID,
        /// Hash of the flagged (suspect) image
        flagged_hash: vector<u8>,
        /// Address that filed the dispute
        flagger: address,
        /// Hamming-distance similarity score (0-255, lower = more similar)
        similarity_score: u8,
        /// 0 = open, 1 = valid (infringement confirmed), 2 = invalid
        status: u8,
        /// Timestamp when the dispute was created
        timestamp: u64,
        /// Staked SUI balance — distributed on resolution
        stake: Balance<SUI>,
    }

    // ═══════════════════════════════════════════════════════════════════
    // Events  (emitted so an off-chain indexer can pick them up)
    // ═══════════════════════════════════════════════════════════════════

    public struct RegistrationEvent has copy, drop {
        cert_id: ID,
        image_hash: vector<u8>,
        creator: address,
        timestamp: u64,
        title: String,
    }

    public struct DisputeEvent has copy, drop {
        dispute_id: ID,
        original_cert_id: ID,
        flagged_hash: vector<u8>,
        flagger: address,
        similarity_score: u8,
        timestamp: u64,
        stake_amount: u64,
    }

    public struct DisputeResolvedEvent has copy, drop {
        dispute_id: ID,
        original_cert_id: ID,
        resolution: u8,
        resolver: address,
    }

    // ═══════════════════════════════════════════════════════════════════
    // Entry functions
    // ═══════════════════════════════════════════════════════════════════

    /// Register a new image hash on-chain.
    /// The caller becomes the owner of the minted RegistrationCertificate.
    entry fun register(
        image_hash: vector<u8>,
        title: String,
        description: String,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        // Hash must be non-empty (typically 32 bytes from perceptual hash)
        assert!(vector::length(&image_hash) > 0, EInvalidHash);

        let timestamp = clock.timestamp_ms();
        let creator = ctx.sender();

        let cert = RegistrationCertificate {
            id: object::new(ctx),
            image_hash,
            creator,
            timestamp,
            title,
            description,
        };

        // Emit indexable event
        event::emit(RegistrationEvent {
            cert_id: object::id(&cert),
            image_hash: cert.image_hash,
            creator,
            timestamp,
            title: cert.title,
        });

        // Transfer to the creator as an owned object
        transfer::transfer(cert, creator);
    }

    /// Flag a registered certificate as potentially infringing.
    /// Requires staking at least 0.1 SUI.
    /// Creates a shared Dispute object so both flagger and creator can interact.
    entry fun flag_content(
        cert: &RegistrationCertificate,
        flagged_hash: vector<u8>,
        similarity_score: u8,
        stake: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(vector::length(&flagged_hash) > 0, EInvalidHash);
        assert!(coin::value(&stake) >= MINIMUM_STAKE, EInsufficientStake);

        let timestamp = clock.timestamp_ms();
        let flagger = ctx.sender();
        let original_cert_id = object::id(cert);
        let stake_amount = coin::value(&stake);

        let dispute = Dispute {
            id: object::new(ctx),
            original_cert_id,
            flagged_hash,
            flagger,
            similarity_score,
            status: STATUS_OPEN,
            timestamp,
            stake: coin::into_balance(stake),
        };

        event::emit(DisputeEvent {
            dispute_id: object::id(&dispute),
            original_cert_id,
            flagged_hash: dispute.flagged_hash,
            flagger,
            similarity_score,
            timestamp,
            stake_amount,
        });

        // Share the dispute so both flagger and creator can access it
        transfer::share_object(dispute);
    }

    /// Resolve a dispute.  Only the original certificate creator may call this.
    /// `resolution`: 1 = valid (infringement confirmed) → stake returned to flagger
    ///               2 = invalid (false flag) → stake forfeited to content creator
    entry fun resolve_dispute(
        dispute: &mut Dispute,
        cert: &RegistrationCertificate,
        resolution: u8,
        ctx: &mut TxContext,
    ) {
        // Only the creator of the original certificate can resolve
        assert!(cert.creator == ctx.sender(), ENotCreator);
        // Dispute must reference this certificate
        assert!(dispute.original_cert_id == object::id(cert), EInvalidResolution);
        // Cannot resolve an already-resolved dispute
        assert!(dispute.status == STATUS_OPEN, EDisputeAlreadyResolved);
        // Resolution must be valid (1) or invalid (2)
        assert!(resolution == STATUS_VALID || resolution == STATUS_INVALID, EInvalidResolution);

        dispute.status = resolution;

        // Withdraw the staked balance and distribute
        let stake_coin = coin::from_balance(
            balance::withdraw_all(&mut dispute.stake),
            ctx,
        );

        if (resolution == STATUS_VALID) {
            // Infringement confirmed → return stake to the flagger
            transfer::public_transfer(stake_coin, dispute.flagger);
        } else {
            // False flag → forfeit stake to the content creator
            transfer::public_transfer(stake_coin, cert.creator);
        };

        event::emit(DisputeResolvedEvent {
            dispute_id: object::id(dispute),
            original_cert_id: dispute.original_cert_id,
            resolution,
            resolver: ctx.sender(),
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // View / accessor functions (useful for other modules & off-chain)
    // ═══════════════════════════════════════════════════════════════════

    public fun cert_image_hash(cert: &RegistrationCertificate): &vector<u8> {
        &cert.image_hash
    }

    public fun cert_creator(cert: &RegistrationCertificate): address {
        cert.creator
    }

    public fun cert_timestamp(cert: &RegistrationCertificate): u64 {
        cert.timestamp
    }

    public fun cert_title(cert: &RegistrationCertificate): &String {
        &cert.title
    }

    public fun cert_description(cert: &RegistrationCertificate): &String {
        &cert.description
    }

    public fun dispute_status(dispute: &Dispute): u8 {
        dispute.status
    }

    public fun dispute_similarity(dispute: &Dispute): u8 {
        dispute.similarity_score
    }

    public fun dispute_flagger(dispute: &Dispute): address {
        dispute.flagger
    }

    public fun dispute_original_cert_id(dispute: &Dispute): ID {
        dispute.original_cert_id
    }

    public fun dispute_stake_value(dispute: &Dispute): u64 {
        balance::value(&dispute.stake)
    }

    public fun minimum_stake(): u64 {
        MINIMUM_STAKE
    }
}
