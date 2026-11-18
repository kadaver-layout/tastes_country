// Точная копия scss-задачи gulpfile с трассировкой: merge libs + server.stream.
import gulp from "gulp";
import sass from "gulp-sass";
import * as dartSass from "sass";
import sourcemaps from "gulp-sourcemaps";
import gulpif from "gulp-if";
import concat from "gulp-concat";
import plumber from "gulp-plumber";
import through2 from "through2";
import merge from "merge-stream";
import browserSync from "browser-sync";

const sassCompiler = sass(dartSass);
const server = browserSync.create();
const tap = (label) => through2.obj(function (file, enc, cb) {
  console.log(label, file.relative || file.path);
  cb(null, file);
});

const libsStream = gulp.src("src/assets/styles/libs/*.*")
  .pipe(tap("libs-src"))
  .pipe(plumber())
  .pipe(gulpif(true, sourcemaps.init()))
  .pipe(sassCompiler().on("error", sassCompiler.logError))
  .pipe(tap("libs-after-sass"))
  .pipe(gulpif(true, sourcemaps.write()))
  .pipe(gulp.dest("dist/assets/css/libs"));

const mainStream = gulp.src("src/assets/styles/main.sass")
  .pipe(tap("main-src"))
  .pipe(plumber())
  .pipe(gulpif(true, sourcemaps.init()))
  .pipe(sassCompiler().on("error", sassCompiler.logError))
  .pipe(tap("main-after-sass"))
  .pipe(concat("main.css"))
  .pipe(gulpif(true, sourcemaps.write()))
  .pipe(tap("main-before-dest"))
  .pipe(gulp.dest("dist/assets/css/"));

merge(libsStream, mainStream)
  .pipe(tap("merged"))
  .pipe(server.stream())
  .on("end", () => console.log("PIPE END"))
  .on("error", (e) => console.log("PIPE ERROR", e.message));
