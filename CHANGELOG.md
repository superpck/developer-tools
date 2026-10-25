# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.3] (Build 2026.10.25-1)

### Fixed
- **API Request Tool - Socket.IO Auth**: WS/WSS requests no longer send a retained/leftover Bearer token in the Socket.IO `auth` handshake after switching Auth Type back to "None" — the token is now only included when Auth Type is actually "Bearer".

## [1.7.2] (Build 2026.10.22-1)

### Added
- **JWT Tool - Readable Timestamps**: Decoded payload now shows a dedicated "Timestamps" section with formatted date & time for `iat` (Issued At) and `exp` (Expires At) claims, alongside the raw JSON. Expired tokens are highlighted in red with an "(Expired)" indicator.

## [1.7.1] (Build 2026.10.21-1)

### Added
- **API Request Tool - Enhanced Save & Recall**:
  - `save()` now conditionally captures and cleans Headers, Auth (Bearer Token), and Body (`raw`, `form-data`, `urlencoded`) only when present, filtering out empty entries.
  - Toast notifications now display details of saved parameters (e.g. `[Headers: 2, Auth: Bearer, Body: raw]`).
  - History Recall list now displays visual badges for saved Headers (with count), Bearer Auth, and Body types.
  - `loadRecord()` properly deep-clones saved arrays to prevent in-place memory mutation.

## [1.7.0] (Build 2026.10.21-1)

### Added
- **Check Digit / MOD Algorithms in Crypto Tool**: Comprehensive Check Digit computation and validation suite supporting all major industrial, banking, identity, and barcode checksum standards:
  - **MOD 10**: Luhn algorithm (ISO/IEC 7812: Credit Cards, IMEI), GS1/EAN/UPC (Weight 3, 1), Weighted 2, 1, and custom weights.
  - **MOD 11**: Bank / Bill Payment cyclic weights 2-7 (Bank of Thailand BOT Ref 1 / Ref 2 standard), Thai National ID (13-digit citizen ID), ISBN-10 (weights 10 down to 2), custom weights, and configurable remainder 10 handling (map to `'0'`, `'X'`, or strict error).
  - **MOD 97**: ISO 7064 MOD 97-10 (IBAN, ISO 11649 Creditor Reference) and simple modulo 97.
  - **MOD 7**: Logistics tracking numbers (FedEx, DHL), USPS Money Order, and IATA ticket numbers.
  - **MOD 23**: Spanish National Identity Number (DNI) letter verification.
  - **MOD 43**: Code 39 industrial barcode checksum character.
  - **MOD 47**: Code 93 barcode dual check characters ('C' and 'K').
  - **MOD 103**: Code 128 barcode symbol check value (Code Sets A, B, and C).
  - **Verhoeff & Damm Algorithms**: Advanced dihedral group $D_5$ (Indian Aadhaar) and quasigroup table algorithms with 100% detection of adjacent transposition errors.
- **Check Digit Options & Features**:
  - Dual action modes: **Generate** (calculate and append check digit) and **Validate** (verify existing numbers with check digit).
  - Output formats: **Detailed Breakdown** (with weights, sum, and step-by-step arithmetic), **Check Digit Only**, and **Full Appended String**.
  - Multi-line batch processing for calculating or validating multiple entries at once.
  - Clean input toggle to automatically ignore spaces and hyphens.
  - One-click copy result to clipboard.

## [1.6.0] (Build 2026.10.11-1)

### Added
- **URL Checking**: Pre-release testing tool for an API endpoint — burst/rate-limit detection (capped request count and concurrency to avoid accidentally overloading a production service), common injection payload testing (XSS, SQL injection, path traversal, command injection, CRLF/header injection, open redirect) via auto-detected query parameters or an explicit `{{payload}}` placeholder, a CORS configuration check, and a recommended security response-headers check. Available at `/url-checking` (not yet linked from the home page).
- Consolidated, severity-ranked security recommendation checklist generated from URL Checking results, plus one-click export of the full report as a Markdown (`.md`) file.

## [1.5.0] (Build 2026.10.03-1)

### Added
- **Subnet Calculator**: Calculate IPv4 network/broadcast address, usable host range, wildcard mask, and reverse DNS pointer from an IP plus a CIDR prefix (`24`) or dotted mask (`255.255.255.0`). Classifies the entered address as private, public, loopback, link-local (APIPA), multicast, CGNAT, documentation, benchmarking, and more per IANA special-purpose ranges, plus a built-in CIDR cheat sheet — no external libraries.

## [1.4.0] (Build 2026.10.02-1)

### Added
- **Text Formatter**: SQL beautifier added alongside JSON/XML/HTML/URL Params — formats `SELECT`, `JOIN`, `WHERE`/`AND`/`OR`, `GROUP BY`/`ORDER BY`, subqueries, and `INSERT`/`VALUES` statements using a built-in tokenizer, no external library.

## [1.3.0] (Build 2026.08.03-1)

### Added
- **Text Formatter**: Pretty-print `JSON`, `XML`, `HTML`, and `URL query strings` using built-in browser APIs only (no external libraries).
- **CSV to Table**: Paste CSV and preview as an interactive table. Supports custom delimiters (`,` `;` tab `|`), quoted fields, and Markdown table export.
- **Markdown Viewer**: Live split-pane editor with rendered preview. Supports headings, bold, italic, code blocks, blockquotes, ordered/unordered lists, links, images, and horizontal rules — no external parser library.

### Changed
- Upgraded Angular to v22.1 and all related dependencies.
- Migrated Tailwind CSS v3 utility classes (`flex-shrink-0`, `flex-grow`) to v4 equivalents (`shrink-0`, `grow`).
- Navigation bar and Home page updated to include links to all new tools.



### Added
- Optional request descriptions when saving history entries.

### Changed
- Updated the Recall modal to show the description as a smaller secondary line.

## [1.0.1] (Build 2026.06.08-2)

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