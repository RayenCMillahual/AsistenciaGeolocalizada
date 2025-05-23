$folders = @(
  "src/app/models",
  "src/app/pages/login",
  "src/app/pages/register",
  "src/app/pages/home",
  "src/app/pages/attendance",
  "src/app/pages/history",
  "src/app/services",
  "src/app/shared/header",
  "src/app/shared/loading"
)

$files = @(
  "src/app/models/user.model.ts",
  "src/app/models/attendance.model.ts",
  "src/app/models/location.model.ts",
  "src/app/services/auth.service.ts",
  "src/app/services/database.service.ts",
  "src/app/services/geolocation.service.ts",
  "src/app/services/camera.service.ts",
  "src/app/services/attendance.service.ts",
  "src/app/app-routing.module.ts",
  "src/app/app.module.ts",
  "src/app/app.component.ts"
)

foreach ($folder in $folders) {
  New-Item -ItemType Directory -Force -Path $folder
}

foreach ($file in $files) {
  New-Item -ItemType File -Force -Path $file
}
