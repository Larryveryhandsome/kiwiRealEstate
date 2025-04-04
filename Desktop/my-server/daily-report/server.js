const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/contents/data.json`;

let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

async function fetchDataFromGitHub() {
    const now = Date.now();
    if (cachedData && (now - lastFetchTime) < CACHE_DURATION) {
        return cachedData;
    }

    try {
        const response = await axios.get(GITHUB_API_URL, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });
        const content = Buffer.from(response.data.content, 'base64').toString('utf8');
        cachedData = JSON.parse(content);
        lastFetchTime = now;
        return cachedData;
    } catch (err) {
        console.error('無法從GitHub拉取資料：', err.message);
        throw err;
    }
}

async function updateDataOnGitHub(newData) {
    try {
        const currentFile = await axios.get(GITHUB_API_URL, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });
        const sha = currentFile.data.sha;

        await axios.put(GITHUB_API_URL, {
            message: 'Update data.json via web editor',
            content: Buffer.from(JSON.stringify(newData, null, 2)).toString('base64'),
            sha: sha
        }, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });

        cachedData = newData;
        lastFetchTime = Date.now();
    } catch (err) {
        console.error('無法更新GitHub資料：', err.message);
        throw err;
    }
}

app.get('/', async (req, res) => {
    try {
        const data = await fetchDataFromGitHub();
        res.send(generateHTML(data));
    } catch (err) {
        res.status(500).send('無法讀取資料：' + err.message);
    }
});

app.get('/edit', async (req, res) => {
    try {
        const data = await fetchDataFromGitHub();
        res.send(generateEditPage(data));
    } catch (err) {
        res.status(500).send('無法讀取資料：' + err.message);
    }
});

app.post('/edit', async (req, res) => {
    try {
        const newData = req.body;
        await updateDataOnGitHub(newData);
        res.redirect('/');
    } catch (err) {
        res.status(500).send('無法儲存資料：' + err.message);
    }
});

function generateHTML(data) {
    let html = `
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>滿築5 工作進度彙報</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f7fa; color: #333; line-height: 1.6; }
            h1 { text-align: center; color: #2c3e50; font-size: 24px; margin-bottom: 20px; }
            h2 { color: #34495e; font-size: 20px; margin: 30px 0 15px; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
            h3 { color: #e74c3c; font-size: 18px; margin: 20px 0 10px; }
            .container { max-width: 900px; margin: 0 auto; }
            .intro { text-align: center; font-size: 14px; color: #666; margin-bottom: 30px; padding: 10px; background-color: #fff; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .section { margin-bottom: 30px; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .section.client, .section.construction, .section.completed { background-color: #fef7f5; border-left: 4px solid #e74c3c; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
            th { background-color: #3498db; color: white; }
            ul { padding-left: 20px; margin: 10px 0; font-size: 14px; }
            li { margin-bottom: 8px; }
            @media (max-width: 600px) { body { padding: 10px; } h1 { font-size: 20px; } h2 { font-size: 18px; } h3 { font-size: 16px; } .intro, table, ul { font-size: 12px; } .section { padding: 15px; } th, td { padding: 8px; } }
        </style>
    </head>
    <body>
        <h1>滿築5 工作進度彙報</h1>
        <div class="intro">培慧姐晚安，這邊是我們的工作彙報，請過目。</div>
        <div class="container">`;

    data.reports.forEach(report => {
        html += `
        <div class="section">
            <h2>${report.dateRange} 工作彙報</h2>
            <h3>一、作業進度總覽</h3>
            <table>
                <thead>
                    <tr><th>項目</th><th>狀態</th><th>備註說明</th></tr>
                </thead>
                <tbody>`;
        report.progress.forEach(item => {
            html += `<tr><td>${item.item}</td><td>${item.status}</td><td>${item.note}</td></tr>`;
        });
        html += `</tbody></table>
            <h3>二、待辦與後續需求</h3>
            <ul>`;
        report.todos.forEach(todo => {
            html += `<li><strong>${todo.task}</strong><br>負責人：${todo.person}<br>截止/進度：${todo.progress}</li>`;
        });
        html += `</ul>
            <h3>三、後續工作計劃</h3>
            <ul>`;
        report.plans.forEach(plan => {
            html += `<li><strong>${plan.plan}</strong>：${plan.details}</li>`;
        });
        html += `</ul></div>`;
    });

    html += `
    <div class="section completed">
        <h2>已完成項目</h2>
        <table>
            <thead>
                <tr><th>項目</th><th>完成日期</th><th>備註說明</th></tr>
            </thead>
            <tbody>`;
    data.completed.forEach(item => {
        html += `<tr><td>${item.item}</td><td>${item.date}</td><td>${item.note}</td></tr>`;
    });
    html += `</tbody></table></div>`;

    html += `
    <div class="section client">
        <h2>客戶彙報</h2>
        <ul>`;
    data.clients.forEach(client => {
        html += `<li><strong>帶看追蹤 - ${client.client}</strong><br>負責人：${client.person}<br>截止/進度：${client.progress}</li>`;
    });
    html += `</ul></div>`;

    html += `</div></body></html>`;
    return html;
}

function generateEditPage(data) {
    let html = `
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>編輯工作進度彙報</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; }
            form { max-width: 900px; margin: 0 auto; }
            .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            label { display: block; margin: 10px 0 5px; }
            input, textarea { width: 100%; padding: 8px; margin-bottom: 10px; }
            button { padding: 10px 20px; background-color: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; }
            button:hover { background-color: #2980b9; }
        </style>
    </head>
    <body>
        <h1>編輯工作進度彙報</h1>
        <form method="POST" action="/edit">
            <div class="section">
                <h2>報表</h2>`;
    data.reports.forEach((report, reportIndex) => {
        html += `
        <div>
            <label>日期範圍</label>
            <input type="text" name="reports[${reportIndex}][dateRange]" value="${report.dateRange}">
            <h3>作業進度</h3>`;
        report.progress.forEach((item, itemIndex) => {
            html += `
            <div>
                <label>項目</label>
                <input type="text" name="reports[${reportIndex}][progress][${itemIndex}][item]" value="${item.item}">
                <label>狀態</label>
                <input type="text" name="reports[${reportIndex}][progress][${itemIndex}][status]" value="${item.status}">
                <label>備註</label>
                <textarea name="reports[${reportIndex}][progress][${itemIndex}][note]">${item.note}</textarea>
            </div>`;
        });
        html += `
            <h3>待辦與後續需求</h3>`;
        report.todos.forEach((todo, todoIndex) => {
            html += `
            <div>
                <label>任務</label>
                <input type="text" name="reports[${reportIndex}][todos][${todoIndex}][task]" value="${todo.task}">
                <label>負責人</label>
                <input type="text" name="reports[${reportIndex}][todos][${todoIndex}][person]" value="${todo.person}">
                <label>進度</label>
                <textarea name="reports[${reportIndex}][todos][${todoIndex}][progress]">${todo.progress}</textarea>
            </div>`;
        });
        html += `
            <h3>後續工作計劃</h3>`;
        report.plans.forEach((plan, planIndex) => {
            html += `
            <div>
                <label>計劃</label>
                <input type="text" name="reports[${reportIndex}][plans][${planIndex}][plan]" value="${plan.plan}">
                <label>細節</label>
                <textarea name="reports[${reportIndex}][plans][${planIndex}][details]">${plan.details}</textarea>
            </div>`;
        });
        html += `</div>`;
    });

    html += `
            </div>
            <div class="section">
                <h2>已完成項目</h2>`;
    data.completed.forEach((item, itemIndex) => {
        html += `
        <div>
            <label>項目</label>
            <input type="text" name="completed[${itemIndex}][item]" value="${item.item}">
            <label>完成日期</label>
            <input type="text" name="completed[${itemIndex}][date]" value="${item.date}">
            <label>備註</label>
            <textarea name="completed[${itemIndex}][note]">${item.note}</textarea>
        </div>`;
    });

    html += `
            </div>
            <div class="section">
                <h2>客戶彙報</h2>`;
    data.clients.forEach((client, clientIndex) => {
        html += `
        <div>
            <label>客戶</label>
            <input type="text" name="clients[${clientIndex}][client]" value="${client.client}">
            <label>負責人</label>
            <input type="text" name="clients[${clientIndex}][person]" value="${client.person}">
            <label>進度</label>
            <textarea name="clients[${clientIndex}][progress]">${client.progress}</textarea>
        </div>`;
    });

    html += `
            </div>
            <button type="submit">儲存</button>
        </form>
    </body>
    </html>`;
    return html;
}

app.listen(port, () => {
    console.log(`伺服器運行在 http://localhost:${port}`);
});