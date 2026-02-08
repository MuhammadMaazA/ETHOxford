/// Hatchmark Content Registry - Sui Move Smart Contract
/// Enables creators to register image perceptual hashes on-chain for authenticity proof
module hatchmark::content_registry {
    use sui::object::{Self, ID, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::string::{Self, String};

    // ========== Error Codes ==========
    const ENotOwner: u64 = 1;
    const EInvalidResolution: u64 = 2;

    // ========== Structs ==========

    /// Registration certificate for a perceptual hash
    /// Owned by the creator, proves authenticity and timestamp
    public struct RegistrationCertificate has key, store {
        id: UID,
        image_hash: u64,         // Perceptual hash of the image
        creator: address,        // Address of the original creator
        timestamp: u64,          // Unix timestamp when registered
        title: String,           // Title/name of the work
        description: String,     // Description provided by creator
    }

    /// Dispute object for flagged content
    /// Created when someone flags potential plagiarism
    public struct Dispute has key, store {
        id: UID,
        original_cert_id: ID,    // Reference to original certificate
        flagged_hash: u64,       // Hash of the allegedly stolen content
        flagger: address,        // Address who flagged the content
        status: u8,              // 0=open, 1=valid, 2=invalid
        timestamp: u64,          // When the dispute was created
    }

    // ========== Events ==========

    /// Emitted when a new registration certificate is created
    public struct RegistrationEvent has copy, drop {
        cert_id: ID,
        image_hash: u64,
        creator: address,
        timestamp: u64,
        title: String,
    }

    /// Emitted when content is flagged for potential plagiarism
    public struct DisputeEvent has copy, drop {
        dispute_id: ID,
        original_cert_id: ID,
        flagged_hash: u64,
        flagger: address,
        timestamp: u64,
    }

    // ========== Public Functions ==========

    /// Register a perceptual hash as owned content
    /// Creates a certificate proving ownership at this timestamp
    public fun register(
        hash: u64,
        title: String,
        description: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let certificate = RegistrationCertificate {
            id: object::new(ctx),
            image_hash: hash,
            creator: tx_context::sender(ctx),
            timestamp: clock::timestamp_ms(clock),
            title,
            description,
        };

        let cert_id = object::id(&certificate);

        // Emit registration event for off-chain indexing
        event::emit(RegistrationEvent {
            cert_id,
            image_hash: hash,
            creator: tx_context::sender(ctx),
            timestamp: clock::timestamp_ms(clock),
            title: certificate.title,
        });

        // Transfer certificate to creator
        transfer::public_transfer(certificate, tx_context::sender(ctx));
    }

    /// Flag potentially stolen content by creating a dispute
    /// Anyone can flag content, but resolution requires original creator
    public fun flag_content(
        original_cert_id: ID,
        flagged_hash: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let dispute = Dispute {
            id: object::new(ctx),
            original_cert_id,
            flagged_hash,
            flagger: tx_context::sender(ctx),
            status: 0, // Open dispute
            timestamp: clock::timestamp_ms(clock),
        };

        let dispute_id = object::id(&dispute);

        // Emit dispute event for off-chain indexing
        event::emit(DisputeEvent {
            dispute_id,
            original_cert_id,
            flagged_hash,
            flagger: tx_context::sender(ctx),
            timestamp: clock::timestamp_ms(clock),
        });

        // Make dispute a shared object so anyone can read it
        transfer::share_object(dispute);
    }

    /// Resolve a dispute (only original certificate owner can resolve)
    /// resolution: 1 = valid dispute (plagiarism confirmed), 2 = invalid dispute
    public fun resolve_dispute(
        dispute: &mut Dispute,
        certificate: &RegistrationCertificate,
        resolution: u8,
        ctx: &mut TxContext
    ) {
        // Verify caller owns the original certificate
        assert!(certificate.creator == tx_context::sender(ctx), ENotOwner);
        
        // Verify this dispute refers to this certificate
        assert!(dispute.original_cert_id == object::id(certificate), EInvalidResolution);
        
        // Verify valid resolution status
        assert!(resolution == 1 || resolution == 2, EInvalidResolution);

        // Update dispute status
        dispute.status = resolution;
    }

    // ========== View Functions ==========

    /// Get certificate details
    public fun get_certificate_info(cert: &RegistrationCertificate): (u64, address, u64, String, String) {
        (cert.image_hash, cert.creator, cert.timestamp, cert.title, cert.description)
    }

    /// Get dispute details
    public fun get_dispute_info(dispute: &Dispute): (ID, u64, address, u8, u64) {
        (dispute.original_cert_id, dispute.flagged_hash, dispute.flagger, dispute.status, dispute.timestamp)
    }

    /// Check if an address owns a specific certificate
    public fun is_owner(cert: &RegistrationCertificate, addr: address): bool {
        cert.creator == addr
    }
}