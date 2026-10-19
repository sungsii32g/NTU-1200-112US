# 淘寶採購清單、搜尋關鍵字與配件選購指南

> 本清單提供 Android 手機（小米 2S / 紅米 Note 11 Pro）連接 MEAN WELL NTU-1200-112US 逆變器所需之線材、模組與配件。

---

## 1. 採購清單總覽

| 序號 | 品項名稱 | 關鍵規格要求 | 適用機型 | 淘寶搜尋關鍵字與連結 |
| :---: | :--- | :--- | :---: | :--- |
| **1** | **工業級光耦隔離 USB 轉 RS-232 轉換器** | 指名 **FTDI FT232RL / FT232RNL 晶片** + 內建電源隔離與數位隔離。抗突波/防雷。<br>※ 推薦採購：[微雪 Waveshare 工業級隔離 USB 轉 RS232/485](https://item.taobao.com/item.htm?id=765058755815)。<br>💡 **現有免購替代方案**：若手邊已有 **MOXA UPort 1110** 或 **UNITEK USB-RS232**，只要搭配手邊現有的 **【MOXA TCC-82 光電隔離器 (4 kV RMS)】** 串接，即具備頂級 4 kV 光耦電氣隔離，**完全無需重複花錢購買微雪轉換器**！ | 通用 | [淘寶搜尋：工業級 光耦隔離 USB轉RS232 FT232](https://world.taobao.com/search/search.htm?q=%E5%B7%A5%E4%B8%9A%E7%BA%A7%20%E5%85%89%E8%80%A6%E9%9A%94%E7%A6%BB%20USB%E8%BD%ACRS232%20FT232) |
| **2** | **DB9 母頭 免焊接接線端子 (帶外殼)** | **必備配件！** DB9 9孔母座，背面帶螺絲端子。因轉換器 RS-232 端為 DB9 公針，需透過此端子將剪開剝皮的四芯電話線（Pin 2, 3, 5）鎖入對接。 | 通用 | [淘寶搜尋：DB9母 免焊接端子 帶外殼](https://world.taobao.com/search/search.htm?q=DB9%E6%AF%8D%20%E5%85%8D%E7%84%8A%E6%8E%A5%E7%AB%AF%E5%AD%90%20%E5%B8%A6%E5%A4%96%E5%A3%B3) |
| **3** | **四芯電話線 6P4C (1~2米)** | 帶標準 6P4C 水晶頭，一頭插 NTU-1200，另一頭剪掉剝皮鎖入上述 DB9 母端子。 | 通用 | [淘寶搜尋：6P4C 四芯電話線](https://world.taobao.com/search/search.htm?q=6P4C%20%E5%9B%9B%E8%8A%AF%E7%94%B5%E8%AF%9D%E7%BA%BF) |
| **4** | **Micro-USB OTG 轉接短線** | Micro-USB 公 轉 USB-A 母，純數據 Host 模式。 | 小米 2S | [淘寶搜尋：Micro USB OTG 轉接頭](https://world.taobao.com/search/search.htm?q=Micro%20USB%20OTG%20%E8%BD%AC%E6%8E%A5%E5%A4%B4) |
| **5** | **LM2596S 可調式降壓模組 (帶數顯)** | 輸入 DC 4.5~40V，輸出可微調至 4.10V，輸出電流 2A~3A。 | 小米 2S | [淘寶搜尋：LM2596S DC-DC 降壓模組 帶數顯](https://world.taobao.com/search/search.htm?q=LM2596S%20DC-DC%20%E9%99%8D%E5%8E%8B%E6%A8%A1%E5%9D%97) |
| **6** | **低 ESR 電解電容 2200uF / 10V** | 並聯於假電池座焊點，吸收脈衝電壓。 | 小米 2S | [淘寶搜尋：2200uF 10V 低阻抗 電解電容](https://world.taobao.com/search/search.htm?q=2200uF%2010V%20%E4%BD%8E%E9%98%BB%E6%8A%97%20%E7%94%B5%E8%A7%A3%E7%94%B5%E5%AE%B9) |
| **7** | **Type-C OTG 帶 PD 快充二合一轉接器** | 具備 Type-C PD 供電輸入孔 + USB-A 數據 Host 孔。 | 紅米 Note 11 Pro | [淘寶搜尋：Type-C OTG 邊充邊用 轉接頭 PD](https://world.taobao.com/search/search.htm?q=Type-C%20OTG%20%E8%BE%B9%E5%85%85%E8%BE%B9%E7%94%A8%20%E8%BD%AC%E6%8E%A5%E5%A4%B4) |

---

## 2. 驗收與安全檢驗清單

- [ ] **光耦隔離測試**：使用三用電表歐姆檔，確認 USB-A 端的 GND 與 DB9 端的 Pin 5 (GND) 之間為**百萬歐姆以上完全斷路**（證明隔離成立，無共模直通）。
- [ ] **端子線色對照**：
  - RJ11 Pin 2 (Rx) ──► 鎖至 DB9 Pin 3 (TXD)
  - RJ11 Pin 3 (GND) ──► 鎖至 DB9 Pin 5 (GND)
  - RJ11 Pin 4 (Tx) ──► 鎖至 DB9 Pin 2 (RXD)
- [ ] **小米 2S 供電電壓校驗**：通電前旋轉 LM2596S 電位器，三用電表量測空載輸出精確為 **4.10V ± 0.05V**。
