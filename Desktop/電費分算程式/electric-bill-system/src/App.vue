<script setup>
import { ref, onMounted } from 'vue'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import html2pdf from 'html2pdf.js'

const electricData = ref([])
const searchQuery = ref('')
const unitPrice = ref(5) // 預設每度電價

// 載入 CSV 資料
const loadData = async () => {
  try {
    const response = await fetch('/114.3、4月電費.csv')
    const csvText = await response.text()
    Papa.parse(csvText, {
      header: true,
      complete: (results) => {
        // 過濾掉空行和標題行
        electricData.value = results.data.filter(row => 
          row.樓層 && row.室 && !row.樓層.includes('總表')
        )
      }
    })
  } catch (error) {
    console.error('載入資料失敗:', error)
  }
}

// 計算用電量
const calculateUsage = (endReading, startReading) => {
  return (parseFloat(endReading) - parseFloat(startReading)).toFixed(1)
}

// 計算應繳金額
const calculateAmount = (usage) => {
  return (parseFloat(usage) * unitPrice.value).toFixed(0)
}

// 匯出 Excel
const exportToExcel = () => {
  const worksheet = XLSX.utils.json_to_sheet(electricData.value)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '電費資料')
  XLSX.writeFile(workbook, '電費資料.xlsx')
}

// 匯出 PDF
const exportToPDF = () => {
  const element = document.getElementById('electric-table')
  html2pdf().from(element).save('電費資料.pdf')
}

// 搜尋功能
const filteredData = computed(() => {
  if (!searchQuery.value) return electricData.value
  const query = searchQuery.value.toLowerCase()
  return electricData.value.filter(row => 
    row.樓層.toLowerCase().includes(query) ||
    row.室.toLowerCase().includes(query) ||
    row.繳納人.toLowerCase().includes(query)
  )
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-6">電費管理系統</h1>
    
    <!-- 搜尋和匯出按鈕 -->
    <div class="flex justify-between mb-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜尋樓層、室別或繳納人..."
        class="px-4 py-2 border rounded"
      />
      <div class="space-x-2">
        <button @click="exportToExcel" class="px-4 py-2 bg-blue-500 text-white rounded">
          匯出 Excel
        </button>
        <button @click="exportToPDF" class="px-4 py-2 bg-green-500 text-white rounded">
          匯出 PDF
        </button>
      </div>
    </div>

    <!-- 電費表格 -->
    <div class="table-container">
      <table id="electric-table" class="electric-table">
        <thead>
          <tr>
            <th>樓層</th>
            <th>室</th>
            <th>錶號</th>
            <th>切表日</th>
            <th>切表度數</th>
            <th>抄表日</th>
            <th>抄表度數</th>
            <th>用電量</th>
            <th>級距/每度</th>
            <th>每層用電量</th>
            <th>本期用電</th>
            <th>本期應納</th>
            <th>繳納人</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in filteredData" :key="index">
            <td>{{ row.樓層 }}</td>
            <td>{{ row.室 }}</td>
            <td>{{ row.錶號 }}</td>
            <td>{{ row.切表日 }}</td>
            <td>{{ row.切表度數 }}</td>
            <td>{{ row.抄表日 }}</td>
            <td>{{ row.抄表度數 }}</td>
            <td>{{ calculateUsage(row.抄表度數, row.切表度數) }}</td>
            <td>{{ unitPrice }}</td>
            <td>{{ row.每層用電量 }}</td>
            <td>{{ row.本期用電 }}</td>
            <td>{{ calculateAmount(row.本期用電) }}</td>
            <td>{{ row.繳納人 }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
