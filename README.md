# 業餘電臺 · 題庫練習
[題庫網址](https://shibawalker.github.io/twradioquiz/)
https://shibawalker.github.io/twradioquiz/
非營利、僅供個人學習與練習的 mobile-first 台灣一、二、三等業餘無線電題庫工具。純靜態 HTML/CSS/JavaScript，沒有登入或後端；IndexedDB 保存個人的學習資料。Production 只需 `public/`，不會解析 PDF，也不使用 runtime AI。

首頁由上到下：

- 三等：大家都可以考！
- 二等：考過三等就可以！
- 一等：設二等臺一年來進階！

選擇等級後可使用全部題庫、分章節、錯題 Only 與該等級模擬考。

## 本機開啟

需要 Python 3：

```sh
npm run dev
# 或 python3 -m http.server 5173 --bind 0.0.0.0 --directory public
```

電腦開啟 http://localhost:5173；同一網路的手機使用 `http://電腦區網IP:5173`。執行網站不需要 npm install；Node/npm 僅供開發與測試。

## GitHub Pages

建立空 repo：名稱使用 `twradioquiz`，README、.gitignore、License 先不由 GitHub 產生，本專案已提供 README 與 .gitignore。免費帳號使用 Public repo。程式碼尚未指定授權；NCC 題庫不能直接當成自己的 MIT 授權內容。

**公開完整題庫前先確認適用授權。** 原 PDF 各自的版權頁明載利用全部或部分內容須徵求 NCC 同意或書面授權。詳見 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。這裡提供部署設定不表示已取得 NCC 授權，也不表示網站已經發布。

發布流程：

1. 將專案推到 repo 的 `main` 分支。
2. Settings → Pages → Build and deployment → Source 選 **GitHub Actions**。
3. Actions → **Deploy GitHub Pages** → Run workflow，或在設定完成後推送新 commit。
4. 流程執行核心與瀏覽器測試，通過後只上傳 `public/`。
。

資源、JSON 與附圖皆使用相對路徑，支援專案子路徑；hash 路由不需要伺服器 rewrite。等級以 `?grade=1`、`?grade=2`、`?grade=3` 表示。沒有 grade 參數時沿用原二等入口，以保留舊書籤行為。

## 題庫及模擬考

| 等級 | 題庫題數 | 六章題數 | 模擬考配額 | 及格 | 時間 |
| --- | ---: | --- | --- | --- | --- |
| 三等 | 570 | 229 / 132 / 145 / 36 / 10 / 18 | 13 / 13 / 6 / 1 / 1 / 1（35 題） | 25 題 | 40 分鐘 |
| 二等 | 606 | 214 / 133 / 184 / 26 / 28 / 21 | 12 / 12 / 10 / 2 / 2 / 2（40 題） | 32 題 | 40 分鐘 |
| 一等 | 874 | 213 / 180 / 364 / 37 / 41 / 39 | 13 / 15 / 15 / 3 / 2 / 2（50 題） | 40 題 | 40 分鐘 |

章節順序：無線電規章與相關法規、無線電通訊方法、無線電系統原理、無線電相關安全防護、電磁相容性技術、射頻干擾的預防與排除。配額及及格標準取自各 PDF 第 2 頁；時間見各書末測試須知。

來源、書名及版權頁連結記載於 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)，網站也提供「題庫來源與權利聲明」。

## 重新匯入

Python 標準函式庫＋Poppler 的 `pdftotext`、`pdfimages`，不需 AI 或額外 Python 套件。

```sh
python3 scripts/import_pdf.py --grade 3
python3 scripts/import_pdf.py --grade 2
python3 scripts/import_pdf.py --grade 1
```

| 等級 | 原始 PDF | 輸出 JSON | 報告 |
| --- | --- | --- | --- |
| 三等 | `data/ncc3.pdf` | `public/data/questions-3.json` | `data/import-report-3.json` |
| 二等 | `data/ncc.pdf` | `public/data/questions.json` | `data/import-report.json` |
| 一等 | `data/ncc1.pdf` | `public/data/questions-1.json` | `data/import-report-1.json` |

匯入器驗證章節題數、連續原題號、四個非空選項與答案；未知 PDF 版本或格式錯誤會輸出檢查報告並失敗，不覆蓋已發布 JSON。每個來源版本的 SHA-256 鎖定在 importer profile。新版 PDF 須先人工核對頁界、題數及附圖，再更新 profile。

PDF 每章原題號重設為 1。ID 為 `ncc{等級}-{章節}-{原題號}`，排序使用 PDF 章節順序與原題號。原始題號與官方答案均保留；只整理排版空白與核對過的漏印題號句點：二等系統原理第 77 題、一等電磁相容性第 19–24 題。答案不猜測、不更正。

附圖從 PDF 擷取並儲存至 `public/data/images/`：三等 3 張（T-1～T-3）、二等 G7-1、一等 11 張（E5-2 等）。所有題幹引用附圖的題目均帶有圖像與來源頁碼。

## 作答與資料

- 選項可改選，按確認才提交；提交後鎖定。
- 一般練習提供「我不會」，同樣需確認才記錄。確認後算一次錯誤、顯示正確答案並永久加入錯題庫；後來答對也保留。儲存值 `-1` 表示主動選擇不會，`null` 仍表示未作答；模擬考維持 A/B/C/D。
- Shuffle 在建立 session 時洗一次，重整不重洗、不重複題目。
- `ever_wrong` 永久保留曾答錯的歷史，之後答對不會自動移出錯題庫。
- 三個等級的 session、統計、錯題與模擬考歷史分開保存。切換等級不會覆蓋另一等級進度。
- 二等仍使用原 IndexedDB `radioquiz` → `app` → `state`，原 ID 與資料格式相容。一等與三等使用 `state:1` 與 `state:3`。單一 transaction 重讀、修改、提交 session 與統計。
- 模擬考使用絕對截止時間。關閉網頁／切換等級不暫停；重新開啟該等級時若已到期則結算。未作答計錯並加入錯題庫。
- 重新開始沿用原題目順序、重新計時，保留歷史作答統計。
- 清除目前 session 只影響目前等級；「清除全部學習紀錄」經兩次確認後清除三個等級的紀錄，題庫不受影響。
- 匯出備份為目前等級的 JSON；尚未提供匯入 UI。

資料依網址 origin 與瀏覽器隔離，區網網址的紀錄不會自動轉移到 github.io。一般關閉／重開瀏覽器可保留資料；私密模式、清除網站資料或儲存空間回收仍可能移除資料。資料管理可申請持續儲存權限及匯出備份。沒有雲端同步與離線 service worker。

## 測試

```sh
npm ci
npm test
npm run test:e2e
```

本機使用 `/usr/bin/google-chrome`，可用 `CHROME_PATH` 指定其他 Chrome；CI 使用 Playwright 安裝的 Chromium。測試伺服器在 5181 同時提供根路徑與 `/radioquiz/`。與開發 server 的 5173 分開使用。

涵蓋三等級題數／連續題號／附圖、各等模擬考配額與及格邊界、完整作答、不同等級紀錄隔離、原二等紀錄恢復、Shuffle 持久化、確認答案、錯題、清除、瀏覽器完整關閉重開與 GitHub Pages 子路徑。手機 320/390/430px 以 Chrome 模擬測試，截圖在 `tests/artifacts/`；尚未以實體 iPhone Safari 驗證。
