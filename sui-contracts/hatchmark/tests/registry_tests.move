/// Tests for the Hatchmark registry module.
#[test_only]
module hatchmark::registry_tests {
    use sui::test_scenario::{Self as ts};
    use sui::clock;
    use std::string;
    use hatchmark::registry::{Self, RegistrationCertificate, Dispute};

    // ───────────────────────────────────────────────────────────
    // Helpers
    // ───────────────────────────────────────────────────────────
    const CREATOR: address = @0xCAFE;
    const FLAGGER: address = @0xBEEF;

    fun sample_hash(): vector<u8> {
        // 32-byte mock perceptual hash
        vector[
            1, 2, 3, 4, 5, 6, 7, 8,
            9, 10, 11, 12, 13, 14, 15, 16,
            17, 18, 19, 20, 21, 22, 23, 24,
            25, 26, 27, 28, 29, 30, 31, 32,
        ]
    }

    fun flagged_hash(): vector<u8> {
        // Slightly different hash (simulating near-duplicate)
        vector[
            1, 2, 3, 4, 5, 6, 7, 8,
            9, 10, 11, 12, 13, 14, 15, 99,
            17, 18, 19, 20, 21, 22, 23, 24,
            25, 26, 27, 28, 29, 30, 31, 32,
        ]
    }

    // ───────────────────────────────────────────────────────────
    // Test 1: Successful registration
    // ───────────────────────────────────────────────────────────
    #[test]
    fun test_register_success() {
        let mut scenario = ts::begin(CREATOR);
        let clk = clock::create_for_testing(scenario.ctx());

        // Register an image hash
        registry::register(
            sample_hash(),
            string::utf8(b"My Photo"),
            string::utf8(b"A beautiful sunset"),
            &clk,
            scenario.ctx(),
        );

        // Advance to next tx so we can inspect the created object
        ts::next_tx(&mut scenario, CREATOR);

        // Creator should own the certificate
        let cert = ts::take_from_sender<RegistrationCertificate>(&scenario);
        assert!(registry::cert_creator(&cert) == CREATOR);
        assert!(*registry::cert_image_hash(&cert) == sample_hash());
        assert!(*registry::cert_title(&cert) == string::utf8(b"My Photo"));

        ts::return_to_sender(&scenario, cert);
        clock::destroy_for_testing(clk);
        ts::end(scenario);
    }

    // ───────────────────────────────────────────────────────────
    // Test 2: Registration fails with empty hash
    // ───────────────────────────────────────────────────────────
    #[test]
    #[expected_failure(abort_code = registry::EInvalidHash)]
    fun test_register_empty_hash_fails() {
        let mut scenario = ts::begin(CREATOR);
        let clk = clock::create_for_testing(scenario.ctx());

        registry::register(
            vector[], // empty hash — should abort
            string::utf8(b"Bad"),
            string::utf8(b""),
            &clk,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clk);
        ts::end(scenario);
    }

    // ───────────────────────────────────────────────────────────
    // Test 3: Flag content creates a dispute
    // ───────────────────────────────────────────────────────────
    #[test]
    fun test_flag_content() {
        let mut scenario = ts::begin(CREATOR);
        let clk = clock::create_for_testing(scenario.ctx());

        // Step 1: Creator registers
        registry::register(
            sample_hash(),
            string::utf8(b"Original"),
            string::utf8(b"desc"),
            &clk,
            scenario.ctx(),
        );

        // Step 2: Flagger flags the content
        ts::next_tx(&mut scenario, FLAGGER);
        let cert = ts::take_from_address<RegistrationCertificate>(&scenario, CREATOR);

        registry::flag_content(
            &cert,
            flagged_hash(),
            5, // similarity score (low hamming distance = very similar)
            &clk,
            scenario.ctx(),
        );

        ts::return_to_address(CREATOR, cert);

        // Step 3: Verify dispute was created for flagger
        ts::next_tx(&mut scenario, FLAGGER);
        let dispute = ts::take_from_sender<Dispute>(&scenario);
        assert!(registry::dispute_status(&dispute) == 0); // STATUS_OPEN
        assert!(registry::dispute_similarity(&dispute) == 5);
        assert!(registry::dispute_flagger(&dispute) == FLAGGER);

        ts::return_to_sender(&scenario, dispute);
        clock::destroy_for_testing(clk);
        ts::end(scenario);
    }

    // ───────────────────────────────────────────────────────────
    // Test 4: Creator resolves dispute as valid
    // ───────────────────────────────────────────────────────────
    #[test]
    fun test_resolve_dispute_valid() {
        let mut scenario = ts::begin(CREATOR);
        let clk = clock::create_for_testing(scenario.ctx());

        // Register
        registry::register(
            sample_hash(),
            string::utf8(b"Original"),
            string::utf8(b""),
            &clk,
            scenario.ctx(),
        );

        // Flag
        ts::next_tx(&mut scenario, FLAGGER);
        let cert = ts::take_from_address<RegistrationCertificate>(&scenario, CREATOR);
        registry::flag_content(&cert, flagged_hash(), 3, &clk, scenario.ctx());
        ts::return_to_address(CREATOR, cert);

        // Resolve — must be called by CREATOR
        ts::next_tx(&mut scenario, CREATOR);
        let cert = ts::take_from_sender<RegistrationCertificate>(&scenario);
        let mut dispute = ts::take_from_address<Dispute>(&scenario, FLAGGER);

        registry::resolve_dispute(&mut dispute, &cert, 1, scenario.ctx()); // 1 = valid
        assert!(registry::dispute_status(&dispute) == 1);

        ts::return_to_address(FLAGGER, dispute);
        ts::return_to_sender(&scenario, cert);
        clock::destroy_for_testing(clk);
        ts::end(scenario);
    }

    // ───────────────────────────────────────────────────────────
    // Test 5: Non-creator cannot resolve dispute
    // ───────────────────────────────────────────────────────────
    #[test]
    #[expected_failure(abort_code = registry::ENotCreator)]
    fun test_resolve_dispute_not_creator_fails() {
        let mut scenario = ts::begin(CREATOR);
        let clk = clock::create_for_testing(scenario.ctx());

        // Register
        registry::register(
            sample_hash(),
            string::utf8(b"Original"),
            string::utf8(b""),
            &clk,
            scenario.ctx(),
        );

        // Flag
        ts::next_tx(&mut scenario, FLAGGER);
        let cert = ts::take_from_address<RegistrationCertificate>(&scenario, CREATOR);
        registry::flag_content(&cert, flagged_hash(), 3, &clk, scenario.ctx());
        ts::return_to_address(CREATOR, cert);

        // FLAGGER tries to resolve — should fail
        ts::next_tx(&mut scenario, FLAGGER);
        let cert = ts::take_from_address<RegistrationCertificate>(&scenario, CREATOR);
        let mut dispute = ts::take_from_sender<Dispute>(&scenario);

        registry::resolve_dispute(&mut dispute, &cert, 1, scenario.ctx()); // should abort

        ts::return_to_address(CREATOR, cert);
        ts::return_to_sender(&scenario, dispute);
        clock::destroy_for_testing(clk);
        ts::end(scenario);
    }
}
