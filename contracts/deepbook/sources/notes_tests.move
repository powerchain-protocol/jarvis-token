#[test_only]
module jarvis_deepbook::notes_tests {
    use jarvis_deepbook::notes;
    #[test]
    fun version_is_pinned() { assert!(notes::integration_version() == 1); }
}
