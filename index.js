import express from "express";
import fs from "fs";
import path from "path";
import bodyParser from "body-parser";
import busboy from "busboy";
import { sanitizeFilename } from "./lib/index.js";

const __filename = import.meta.url;
const __dirname = path.dirname(__filename).replace(/file:/, "");

const app = express();
const port = 5000;
const uploadPath = path.join(__dirname, "uploads");
const publicPath = path.join(__dirname, "public");
const libPath = path.join(__dirname, "lib");

app.use(express.static(publicPath));
app.use("/lib", express.static(libPath));
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

    if (
      contentRangeStart >= contentRangeLength ||
      contentRangeStart >= contentRangeEnd ||
      contentRangeEnd > contentRangeLength
    ) {
      throw new Error("Invalid Content-Range!");
    }

    bb.on("file", (_, file, info) => {
      console.log({ file, info });
      ext = info.filename.split(".")[1];
      file.pipe(fs.createWriteStream(filePath, { flags: "a" }));
    });

    bb.on("close", () => {
      fs.renameSync(filePath, `${filePath}.${ext}`);
      return res.status(200).send("upload finished!");
    });

    req.pipe(bb);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal server error!");
  }
});

app.post("/upload/request", (req, res) => {
  try {
    const data = req.body;
    const filename = sanitizeFilename(data.filename);
    const filePath = path.join(uploadPath, filename);

    if (!filename) throw new Error("Missing filename!");

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "");
    }

    return res.status(200).send(filename);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal server error!");
  }
});

app.get("/upload/status/:filename", (req, res) => {
  const filename = sanitizeFilename(req.params.filename);
  const filePath = path.join(uploadPath, filename);

  if (fs.existsSync(filePath)) {
    const file = fs.readFileSync(filePath);

    return res.status(200).send(String(file.length));
  }

  return res.status(404).send("File not found!");
});

app.all("*", (req, res) => {
  res.status(404).send("Not found!");
});

app.listen(port, () => console.log(`Server running on port ${port}...`));