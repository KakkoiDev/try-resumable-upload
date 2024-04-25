import { sanitizeFilename } from "./lib/index.js";

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

const uploadFile = ({ file, fileId, startByte }) => {
  const request = new XMLHttpRequest();
  const formData = new FormData();
  const chunk = file.slice(Number(startByte));

  formData.append("file", chunk, file.name);

  displayPause.addEventListener("click", () => {
    request.abort();
    displayStatus.innerHTML = "paused";
  });

  request.open("POST", "http://localhost:5000/upload");
  request.setRequestHeader("X-File-Id", fileId);
  request.setRequestHeader(
    "Content-Range",
    `bytes ${startByte}-${startByte + chunk.size}/${file.size}`
  );

  request.onloadstart = () => {
    displayInfo.classList.remove("hidden");
    displayName.innerHTML = file.name;
    displayProgress.innerHTML = 0;
    displayStatus.innerHTML = "in progress...";
  };

  request.upload.onprogress = (event) => {
    displayProgress.innerHTML = (
      ((event.loaded + startByte) * 100) /
      file.size
    ).toFixed(0);
  };

  request.onload = () => {
    displayStatus.innerHTML = "completed";
  };

  request.send(formData);
};

const resumableUpload = async (file) => {
  const fileId = sanitizeFilename(
    `${file.name}-${file.size}-${file.lastModified}`
  );

  const startByteResponse = await fetch("http://localhost:5000/upload/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileId,
    }),
  });

  const startByte = Number(await startByteResponse.text());

  uploadFile({ file, fileId, startByte });
};
