import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { exec } from "child_process";

const app = express();

// Multer middleware
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const fileName = `${uuidv4()}-${file.originalname}`;
    cb(
      null,
      file?.filename ??
        "sample" + "-" + uuidv4() + path.extname(file.originalname)
    );
  },
});

//multer configuration
const upload = multer({
  storage: storage,
});

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  })
);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Accept",
    "Origin, X-Requested-With,X-HTTP-Method-Override, Accept"
  );
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.json({ message: "Hello World!" });
});

app.post("/upload", upload.single("file"), (req, res) => {
  const lessonId = uuidv4();
  const videoPath = req.file.path;
  const outputPath = `./uploads/lectures/${lessonId}`;
  const hlsPath = `${outputPath}/index.m3u8`;
  console.log("hlsPath", hlsPath);

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  //ffmpeg command here and maximum optimization goes here in future
  //No queue because of POC(Proof of concept) but in future we can use queue for multiple video conversion
  const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;

  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);

    const videoUrl = `http://localhost:8000/uploads/lectures/${lessonId}/index.m3u8`;
    res.json({ 
        message: "video converted successfully",
        videoUrl: videoUrl,
        lessonId: lessonId
     });
  });
});

app.listen(8000, () => {
  console.log("Server is running on port 8000");
});
