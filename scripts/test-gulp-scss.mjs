// Диагностика gulp-пайплайна scss: где теряются файлы.
import gulp from "gulp";
import sass from "gulp-sass";
import * as dartSass from "sass";
import sourcemaps from "gulp-sourcemaps";
import gulpif from "gulp-if";
import concat from "gulp-concat";
import plumber from "gulp-plumber";
import through2 from "through2";

const sassCompiler = sass(dartSass);
const tap = (label) => through2.obj(function (file, enc, cb) {
  console.log(label, file.relative || file.path);
  cb(null, file);
});

gulp.src("src/assets/styles/main.sass")
  .pipe(tap("src"))
  .pipe(plumber())
  .pipe(tap("after-plumber"))
  .pipe(gulpif(true, sourcemaps.init()))
  .pipe(tap("after-sourcemaps"))
  .pipe(sassCompiler().on("error", sassCompiler.logError))
  .pipe(tap("after-sass"))
  .pipe(concat("main.css"))
  .pipe(tap("after-concat"))
  .pipe(gulp.dest("dist/assets/css/"))
  .on("end", () => console.log("PIPE END"))
  .on("error", (e) => console.log("PIPE ERROR", e.message));
