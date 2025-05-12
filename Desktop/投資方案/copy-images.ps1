# 創建目標資料夾
New-Item -ItemType Directory -Force -Path "images"

# 複製東港路商業區店面圖片
Copy-Item "../東港路商業區店面/東港店面.jpg" -Destination "images/donggang.jpg" -Force

# 複製礁溪改建透天圖片
Copy-Item "../礁溪改建透天-重新裝潢出售/下載.jpg" -Destination "images/jiaoxi.jpg" -Force

# 複製宜蘭市中心商業店面圖片
Copy-Item "../宜蘭市中心商業店面改建出售/下載.jpg" -Destination "images/yilan.jpg" -Force

# 複製和睦段小建地圖片
Copy-Item "../和睦段小建地-搭設小屋做店面/522406.jpg" -Destination "images/hemu.jpg" -Force

Write-Host "圖片複製完成！" 