Write-Host "Đang build dự án..." -ForegroundColor Cyan
bun run build
Copy-Item -Path .\dist\index.html -Destination .\dist\404.html -Force
New-Item -ItemType File -Path .\dist\.nojekyll -Force -ErrorAction SilentlyContinue

Write-Host "Đang đẩy lên nhánh gh-pages..." -ForegroundColor Cyan
Push-Location dist
git init
git checkout -B gh-pages
git add -A
git commit -m "Deploy production build to GitHub Pages"
git remote add origin https://github.com/lamhanhthptanlao-boop/Ms-Meo-T-ng-t-c.git 2>$null
git push -u origin gh-pages --force
Pop-Location

Write-Host "Triển khai thành công! Link web: https://lamhanhthptanlao-boop.github.io/Ms-Meo-T-ng-t-c/" -ForegroundColor Green
