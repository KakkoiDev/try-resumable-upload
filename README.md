# try-resumable-upload

Upload a file. If the upload gets interupted, resume the upload from where it left off.

![demo](./demo.gif)

## Features

- Pause/resume upload
- Close tab and resume download from where it left off
- Retry in case of network failure (untested, see reason in the Bugs section)

## How Does It Work?

1. Using the `XMLHttpRequest` class, the client sends a file to `POST /upload`. The client displays what percentage of the file has been sent.
2. The server writes the stream to a specific file by appending the bytes to it as they arrive.
3. To enable resumability, before sending the file, the client requests the server to check if the file was already beeing uploaded and if yes, how many bytes where already sent using `POST /request` and `GET /status/:fileId`.

## Develop

Install dependencies: `npm i`

Start dev server: `npm run dev`

## Bugs

Simulate network failure: When switching the network to "Offline", the upload completes at full speed. Probably a Chrome bug.
![bug](./bug.gif)

## Resources

Implement a resumable upload from scratch: https://www.youtube.com/watch?v=R2AD1h0iQAw

Javascript.info, resumable upload: https://javascript.info/resume-upload

Uppy, the all in on resumable upload solution: https://uppy.io/

## Todos

- [ ] refactor `/public/index.js`, separate logic from DOM update
- [x] remove XMLHttpRequest optional second argument
- [x] merge `POST /request` and `GET /status` into one endpoint
- [x] add retry (untested, see Bugs section)
- [ ] make it Tus compliant
- [ ] handle multi-upload
