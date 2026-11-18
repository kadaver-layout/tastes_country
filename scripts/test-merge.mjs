// Диагностика merge-stream: пустой libs-поток + основной поток.
import gulp from "gulp";
import through2 from "through2";
import merge from "merge-stream";

const tap = (label) => through2.obj(function (file, enc, cb) {
  console.log(label, file.relative || file.path);
  cb(null, file);
});

const libs = gulp.src("src/assets/styles/libs/*.*").pipe(tap("libs"));
const main = gulp.src("src/assets/styles/main.sass").pipe(tap("main"));

merge(libs, main)
  .pipe(tap("merged"))
  .on("end", () => console.log("MERGE END"))
  .on("error", (e) => console.log("MERGE ERROR", e.message));

setTimeout(() => console.log("timeout: event loop alive check"), 3000);
