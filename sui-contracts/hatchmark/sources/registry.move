/// Hatchmark Registry — on-chain content authenticity for the provenance economy.
///
/// Creators register perceptual image hashes as owned objects on Sui.
/// Anyone can flag suspect content, creating a transparent dispute record.
/// Only the original creator may resolve a dispute.
module hatchmark::registry {
    // ═══════════════════════════════════════════════════════════════════
    // Imports
    // ═══════════════════════════════════════════════════════════════════
    use sui::event;
    use sui::clock::Clock;
    use std::string::String;

    // ═══════════════════════════════════════════════════════════════════
    // Error codes
    // ═══════════════════════════════════════════════════════════════════
    const ENotCreator: u64 = 0;
    const EInvalidHash: u64 = 1;
    const EDisputeAlreadyResolved: u64 = 2;
    const EInvalidResolution: u64 = 3;

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
    /// Created by the flagger, resolved only by the original creator.
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
    /// Creates a Dispute object owned by the flagger.
    entry fun flag_content(
        cert: &RegistrationCertificate,
        flagged_hash: vector<u8>,
        similarity_score: u8,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(vector::length(&flagged_hash) > 0, EInvalidHash);

        let timestamp = clock.timestamp_ms();
        let flagger = ctx.sender();
        let original_cert_id = object::id(cert);

        let dispute = Dispute {
            id: object::new(ctx),
            original_cert_id,
            flagged_hash,
            flagger,
            similarity_score,
            status: STATUS_OPEN,
            timestamp,
        };

        event::emit(DisputeEvent {
            dispute_id: object::id(&dispute),
            original_cert_id,
            flagged_hash: dispute.flagged_hash,
            flagger,
            similarity_score,
            timestamp,
        });

        // Flagger owns the dispute object
        transfer::transfer(dispute, flagger);
    }

    /// Resolve a dispute.  Only the original certificate creator may call this.
    /// `resolution`: 1 = valid (infringement confirmed), 2 = invalid (false flag)
    entry fun resolve_dispute(
        dispute: &mut Dispute,
        cert: &RegistrationCertificate,
        resolution: u8,
        ctx: &TxContext,
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
}
