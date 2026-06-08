# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] (Build 2026.06.08-2) - 2026-06-08

### Added
- **API Request Tool**: Full-featured HTTP client allowing users to configure Methods, URL, Headers, Auth (Bearer context), and Request Bodies (raw, form-data, urlencoded).
- **Request Timer**: Automatically tracks and displays the elapsed time, status code, and response size for every API request.
- **IndexedDB History**: Save and recall previous configurations locally within the browser.
- **Toast Notifications**: Added custom Toast alert interactions on save operations.
- **Crypto Tool**: Interface for One-way hashing (MD5, SHA1, SHA256, SHA512) and Two-way Encryption (Base64 Encode/Decode, AES Encrypt/Decrypt).
- **JWT Tool**: Intuitive interface to Decode tokens, accurately verify signatures, and Encode/generate fully custom JSON Web Tokens (supporting HS256, HS384, HS512).
- **Fixed Top Navigation Layout**: Persistent App layout rendering with easy access to all developer tools globally.

### Changed
- Refactored Angular architecture to utilize Standalone Components and the new Signals reactivity model heavily.
- Migrated primary CSS frameworks to Tailwind CSS for sleek interface design.