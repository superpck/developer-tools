# API Tester (Developer Tools)

A modern, fast, and intuitive web application built with Angular and Tailwind CSS to construct, send, and analyze HTTP requests directly from your browser. It also includes built-in developer tools like Cryptography utilities and a JWT visualizer.

## 🔥 Features

- **API Request Tool**: Send `GET`, `POST`, `PUT`, `DELETE` requests directly from the app. Supports dynamic headers, authorization (Bearer), and multiple body types (Raw, Form-Data, URL-Encoded).
- **Request Timers & Metrics**: See your response status, precise latency (ms), and size payload easily.
- **IndexedDB History**: Save payloads and configuration states directly into the browser to easily recall testing parameters. Includes toast notifications on successful actions.
- **Crypto Tool**: Fast one-way hashing (`MD5`, `SHA1`, `SHA256`, `SHA512`) and two-way encoding/encryption (`Base64`, `AES`).
- **JWT Tool**: Seamlessly Decode, Encode, and verify JSON Web Tokens (supporting `HS256`, `HS384`, `HS512` structures) through a side-by-side graphical interface.

## 🚀 Tech Stack

- [Angular 21](https://angular.dev/) (Standalone Components, Signals & Control flows)
- [Tailwind CSS v3+](https://tailwindcss.com/)
- [CryptoJS](https://github.com/brix/crypto-js)
- Browser `fetch` API & `IndexedDB`

## 🛠️ Development server

To start a local development server, run:

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## 📦 Building

To build the project run:

```bash
npm run build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
