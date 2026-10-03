# Developer Tools for Web Applications

**Version:** 1.5.0  
**Build:** 2026.10.03-1

A modern, fast, and intuitive web application built with Angular and Tailwind CSS. A collection of everyday developer utilities — all running in the browser with no backend required.

## 🔥 Features

- **API Request Tool**: Send `GET`, `POST`, `PUT`, `DELETE` requests directly from the app. Supports dynamic headers, authorization (Bearer), multiple body types (Raw, Form-Data, URL-Encoded), and Socket.IO `WS`/`WSS` testing.
- **Request Timers & Metrics**: See your response status, precise latency (ms), and size payload easily.
- **IndexedDB History**: Save payloads and configuration states directly into the browser to easily recall testing parameters. Includes toast notifications on successful actions.
- **Crypto Tool**: Fast one-way hashing (`MD5`, `SHA1`, `SHA256`, `SHA512`) and two-way encoding/encryption (`Base64`, `AES`).
- **JWT Tool**: Seamlessly Decode, Encode, and verify JSON Web Tokens (supporting `HS256`, `HS384`, `HS512` structures) through a side-by-side graphical interface.
- **Text Formatter**: Beautify and pretty-print `JSON`, `XML`, `HTML`, `SQL`, and `URL query strings` — no external libraries, built-in only.
- **CSV to Table**: Paste CSV data and preview it as an interactive table. Supports custom delimiters (`,` `;` `tab` `|`) and quoted fields. Export as Markdown table.
- **Markdown Viewer**: Live split-pane Markdown editor with rendered preview. Supports headings, bold, italic, code blocks, blockquotes, lists, links, and images.
- **Network Diagnostics**: Browser-side network utility tools.
- **Subnet Calculator**: Calculate IPv4 network/broadcast address, usable host range, and host counts from an IP plus a CIDR prefix (`24`) or dotted mask (`255.255.255.0`). Also classifies the address as private, public, loopback, link-local, multicast, CGNAT, documentation, and more — no external libraries.
- **Symbol Tool**: Quick reference for common Unicode symbols.

## 🚀 Tech Stack

- [Angular 22](https://angular.dev/) (Standalone Components, Signals & Control flows)
- [Tailwind CSS v4+](https://tailwindcss.com/)
- [CryptoJS](https://github.com/brix/crypto-js)
- [Socket.IO Client](https://socket.io/docs/v4/client-api/)
- Browser `fetch` API & `IndexedDB`

## 🛠️ Development server

To start a local development server, run:

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4204/`. The application will automatically reload whenever you modify any of the source files.

## 📦 Building

To build the project run:

```bash
npm run build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Demo & Usage

- https://superpck.github.io/developer-tools/#/


## 📄 License

This project is licensed under the [MIT License](LICENSE).
