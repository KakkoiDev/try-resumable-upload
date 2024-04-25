import { sanitizeFilename } from "./lib/index.js";
import { errors } from "./data/index.js";

// get file
const label = document.querySelector("label");
let currentFile = null;

const handleFileInputChange = async (event) => {
  const files = event.target.files;
  const file = [...files][0];
  currentFile = file;

  // reset
  event.target.value = null;

  // upload file
  await resumableUpload(file);
};

label.addEventListener("change", handleFileInputChange);

// upload file
const displayInfo = document.querySelector("#info");
const displayName = document.querySelector("#name");
const displayProgress = document.querySelector("#progress");
const displayStatus = document.querySelector("#status");
const displayPause = document.querySelector("#pause");
const displayResume = document.querySelector("#resume");

displayResume.addEventListener("click", async () => {
  await resumableUpload(currentFile);
});

const uploadFile = async ({ file, fileId, startByte }) => {
  try {
    let status = 200;
    let headers = {};

    const body = await new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      const formData = new FormData();
      const chunk = file.slice(Number(startByte));
      let loaded = 0;

      headers = {
        "X-File-Id": fileId,
        "Content-Range": `bytes ${startByte}-${startByte + chunk.size}/${
          file.size
        }`,
      };

      formData.append("file", chunk, file.name);

      displayPause.addEventListener("click", () => {
        request.abort();
        displayStatus.innerHTML = "paused";
      });

      request.open("POST", "http://localhost:5000/upload");
      for (const [key, value] of Object.entries(headers ?? {})) {
        request.setRequestHeader(key, value);
      }

      request.onloadstart = () => {
        displayInfo.classList.remove("hidden");
        displayName.innerHTML = file.name;
        displayProgress.innerHTML = 0;
        displayStatus.innerHTML = "in progress...";
      };

      request.upload.onprogress = (event) => {
        displayProgress.innerHTML = (
          ((loaded + startByte) * 100) /
          file.size
        ).toFixed(0);

        loaded = event.loaded;
      };

      request.onload = () => {
        // triggered on upload complete
        if (request.status === 200) {
          displayStatus.innerHTML = "completed";
          displayProgress.innerHTML = "100";
          resolve(request.responseText);
        }

        if (request.status !== 200) {
          status = request.status;
          reject(JSON.stringify({ message: request.statusText }));
        }
      };

      request.onerror = () => {
        // triggered on network error
        reject(new Error(errors.error));
      };

      request.onabort = () => {
        // triggered when pausing the upload
        reject(new Error(errors.abort));
      };

      request.send(formData);
    });

    return new Response(body, {
      status,
      statusText: "OK",
      headers: new Headers(headers),
    });
  } catch (error) {
    throw error;
  }
};

const resumableUpload = async (file) => {
  try {
    const fileId = sanitizeFilename(
      `${file.name}-${file.size}-${file.lastModified}`
    );

    const startByteResponse = await fetch(
      `http://localhost:5000/upload/check/${fileId}`
    );

    const startByte = Number(await startByteResponse.text());

    const uploadResponse = await uploadFile({ file, fileId, startByte });
    console.log(await uploadResponse.text());
  } catch (error) {
    console.error(error);

    if (error.message === errors.error || error.message === "Failed to fetch") {
      console.log("network error!");
      console.log("retry in 5 seconds...");

      // retry feature is still untested, because when I set the network to offline, it just speeds up the upload until it is finished.
      setTimeout(async () => {
        console.log("retry now!");
        await resumableUpload(currentFile);
      }, 5000);
    }
  }
};
