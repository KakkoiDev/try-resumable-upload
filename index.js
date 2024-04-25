import express from "express";
import fs from "fs";
import path from "path";
import bodyParser from "body-parser";
import busboy from "busboy";
import { sanitizeFilename } from "./lib/index.js";

const __dirname = import.meta.dirname;

const app = express();
const port = 5000;
const uploadPath = path.join(__dirname, "uploads");
const publicPath = path.join(__dirname, "public");
const libPath = path.join(__dirname, "lib");
const dataPath = path.join(__dirname, "data");

app.use(express.static(publicPath));
app.use("/lib", express.static(libPath));
app.use("/data", express.static(dataPath));
app.use(bodyParser.json());

app.post("/upload", (req, res) => {
  try {
    const contentRange = req.headers["content-range"];
    const fileId = req.headers["x-file-id"];
    const filePath = path.join(uploadPath, fileId);
    let ext = null;
    const bb = busboy({ headers: req.headers });

    // check content-range
    const contentRangeMatch = contentRange.match(/bytes\s(\d*)-(\d*)\/(\d*)/);
    const contentRangeStart = Number(contentRangeMatch[1]);
    const contentRangeEnd = Number(contentRangeMatch[2]);
    const contentRangeLength = Number(contentRangeMatch[3]);

    let uploadedBytes = contentRangeStart; // not preferred solution for network error detection

    if (
      contentRangeStart >= contentRangeLength ||
      contentRangeStart >= contentRangeEnd ||
      contentRangeEnd > contentRangeLength
    ) {
      throw new Error("Invalid Content-Range!");
    }

    bb.on("file", (_, file, info) => {
      ext = info.filename.split(".").at(-1);

      file.on("data", (data) => {
        // to know if network error occured, store bytes count as they arrive
        // if network error, the data event will artificailly try to process big unexisting chuncks (on localhost at least)
        // it finishes uploading the file in local environment so I guess it's a browser bug
        // should be able to able to just use fs.statSync to get the file size in "close" and compare it to contentRangeLength
        uploadedBytes += data.length < 20_000 ? data.length : 0;
      });

      file.pipe(fs.createWriteStream(filePath, { flags: "a" }));
    });

    bb.on("close", () => {
      // const fileSize = fs.statSync(filePath).size; // preferred solution to determine if network error occurred

      if (contentRangeLength === uploadedBytes) {
        fs.renameSync(filePath, `${filePath}.${ext}`);
        return res.status(200).send("upload finished!");
      } else {
        return res.status(500).send("upload error!");
      }
    });

    req.pipe(bb);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal server error!");
  }
});

app.get("/upload/check/:fileId", (req, res) => {
  try {
    const fileId = sanitizeFilename(req.params.fileId);
    const filePath = path.join(uploadPath, fileId);

    if (!fileId) throw new Error("Missing filename!");

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "");
      return res.status(200).send(String(0));
    }

    const file = fs.readFileSync(filePath);
    return res.status(200).send(String(file.length));
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal server error!");
  }
});

app.all("*", (req, res) => {
  res.status(404).send("Not found!");
});

app.listen(port, () => console.log(`Server running on port ${port}...`));
