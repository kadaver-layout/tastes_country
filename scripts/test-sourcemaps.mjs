// Диагностика: sourcemaps.write() перед gulp.dest.
import gulp from "gulp";
import sass from "gulp-sass";
import * as dartSass from "sass";
import sourcemaps from "gulp-sourcemaps";
import concat from "gulp-concat";
import through2 from "through2";

const sassCompiler = sass(dartSass);
const tap = (label) => through2.obj(function (file, enc, cb) {
  console.log(label, file.relative, "bytes:", file.contents ? file.contents.length : 0);
  cb(null, file);
});

gulp.src("src/assets/styles/main.sass")
  .pipe(sourcemaps.init())
  .pipe(sassCompiler().on("error", sassCompiler.logError))
  .pipe(concat("main.css"))
  .pipe(tap("before-write"))
  .pipe(sourcemaps.write())
  .pipe(tap("after-write"))
  .pipe(gulp.dest("dist/assets/css/"))
  .on("end", () => console.log("PIPE END"))
  .on("error", (e) => console.log("PIPE ERROR", e.message));
