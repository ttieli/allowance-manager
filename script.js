// 初始化数据结构
const allowanceTypes = [
    'xiaoha-allowance',
    'xiaoha-time',
    'yezi-allowance',
    'yezi-time'
];

// 类型显示名称映射
const typeNames = {
    'xiaoha-allowance': '小哈额度',
    'xiaoha-time': '小哈时长',
    'yezi-allowance': '椰子额度',
    'yezi-time': '椰子时长'
};

// 自动重置的类型(每月1号重置)
const autoResetTypes = ['xiaoha-allowance', 'yezi-allowance'];

// 加载数据
function loadAllData() {
    let allDataValid = true;
    
    allowanceTypes.forEach(type => {
        const data = loadData(type);
        if (!data) {
            allDataValid = false;
            // 初始化默认数据
            saveData(type, {
                type: type,
                value: type === 'xiaoha-allowance' ? 0.5 : (type === 'yezi-allowance' ? 1 : 0),
                lastUpdate: null,
                history: []
            });
        }
    });
    
    // 如果是第一次加载或数据缺失，检查是否需要自动增加额度
    if (!allDataValid) {
        checkMonthlyReset();
    }
    
    updateAllUI();
}

// 加载特定类型的数据
function loadData(type) {
    const dataJson = localStorage.getItem(`allowance-${type}`);
    if (!dataJson) return null;
    
    try {
        return JSON.parse(dataJson);
    } catch (e) {
        console.error(`Error parsing data for ${type}:`, e);
        return null;
    }
}

// 保存数据
function saveData(type, data) {
    localStorage.setItem(`allowance-${type}`, JSON.stringify(data));
}

// 更新所有UI
function updateAllUI() {
    allowanceTypes.forEach(type => {
        const data = loadData(type);
        if (data) {
            updateTypeUI(type, data);
        }
    });
}

// 更新特定类型的UI
function updateTypeUI(type, data) {
    // 更新余额
    const valueElement = document.getElementById(`${type}-value`);
    valueElement.textContent = data.value;
    
    // 如果是负值，显示红色
    if (data.value < 0) {
        valueElement.classList.add('negative');
    } else {
        valueElement.classList.remove('negative');
    }
    
    // 更新最后更新时间
    const updateElement = document.getElementById(`${type}-update`);
    if (data.lastUpdate) {
        updateElement.textContent = `最后更新: ${formatDateTime(data.lastUpdate)}`;
    } else {
        updateElement.textContent = '最后更新: 无记录';
    }
    
    // 更新历史记录
    const historyElement = document.getElementById(`${type}-history`);
    historyElement.innerHTML = '';
    
    if (data.history && data.history.length > 0) {
        data.history.slice().reverse().forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const actionClass = item.action === 'add' ? 'add' : 'use';
            const actionText = item.action === 'add' ? '增加' : '使用';
            
            historyItem.innerHTML = `
                <div>
                    <span class="history-date">${formatDateTime(item.timestamp)}</span>
                    <span class="history-action ${actionClass}">${actionText} ${item.amount}</span>
                    <span class="history-reason">(${item.reason})</span>
                </div>
                <div class="history-operator">${item.operator}</div>
            `;
            
            historyElement.appendChild(historyItem);
        });
    } else {
        historyElement.innerHTML = '<div class="empty-history">暂无记录</div>';
    }
}

// 格式化日期时间
function formatDateTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 显示操作对话框
function showActionDialog(type, action) {
    const dialog = document.getElementById('action-dialog');
    const title = document.getElementById('dialog-title');
    const actionType = document.getElementById('action-type');
    const actionCategory = document.getElementById('action-category');
    const amountInput = document.getElementById('action-amount');
    
    // 设置对话框标题
    title.textContent = action === 'add' ? `增加${typeNames[type]}` : `使用${typeNames[type]}`;
    
    // 设置隐藏字段值
    actionType.value = action;
    actionCategory.value = type;
    
    // 根据类型设置默认值
    if (action === 'add') {
        if (type.includes('time')) {
            amountInput.value = '60'; // 默认增加60分钟
        } else {
            amountInput.value = '1'; // 默认增加1个额度
        }
    } else {
        if (type.includes('time')) {
            amountInput.value = '15'; // 默认使用15分钟
        } else {
            amountInput.value = '0.5'; // 默认使用0.5个额度
        }
    }
    
    // 显示对话框
    dialog.style.display = 'flex';
    
    // 聚焦数量输入框
    amountInput.focus();
    amountInput.select();
}

// 关闭对话框
function closeDialog() {
    document.getElementById('action-dialog').style.display = 'none';
    document.getElementById('action-form').reset();
}

// 提交操作
function submitAction() {
    const type = document.getElementById('action-category').value;
    const action = document.getElementById('action-type').value;
    const amountStr = document.getElementById('action-amount').value;
    const reason = document.getElementById('action-reason').value;
    const operator = document.getElementById('action-operator').value;
    
    if (!amountStr || !reason || !operator) {
        alert('请填写所有字段');
        return;
    }
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        alert('请输入有效的正数金额');
        return;
    }
    
    // 加载当前数据
    const data = loadData(type);
    if (!data) {
        alert('数据加载失败');
        return;
    }
    
    // 创建历史记录项
    const historyItem = {
        timestamp: new Date().toISOString(),
        action: action,
        amount: amount,
        reason: reason,
        operator: operator
    };
    
    // 更新余额
    if (action === 'add') {
        data.value += amount;
    } else {
        data.value -= amount;
    }
    
    // 更新最后更新时间
    data.lastUpdate = new Date().toISOString();
    
    // 添加到历史记录
    data.history.push(historyItem);
    
    // 限制历史记录最多保存50条
    if (data.history.length > 50) {
        data.history = data.history.slice(data.history.length - 50);
    }
    
    // 保存数据
    saveData(type, data);
    
    // 更新UI
    updateTypeUI(type, data);
    
    // 关闭对话框
    closeDialog();
}

// 切换标签
function switchTab(tabId) {
    // 隐藏所有标签内容
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 取消所有标签按钮的活动状态
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // 显示选定的标签内容
    document.getElementById(tabId).classList.add('active');
    
    // 设置选定标签按钮的活动状态
    document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
    
    // 保存当前选中的标签
    localStorage.setItem('last-active-tab', tabId);
}

// 导出数据
function exportData() {
    const exportData = {};
    
    allowanceTypes.forEach(type => {
        exportData[type] = loadData(type);
    });
    
    const dataStr = JSON.stringify(exportData, null, 2);
    
    // 创建文本区域显示数据
    const textarea = document.createElement('textarea');
    textarea.value = dataStr;
    textarea.style.width = '100%';
    textarea.style.height = '200px';
    textarea.style.marginTop = '10px';
    
    // 创建模态框显示数据
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    
    const content = document.createElement('div');
    content.style.backgroundColor = 'white';
    content.style.padding = '20px';
    content.style.borderRadius = '10px';
    content.style.width = '90%';
    content.style.maxWidth = '600px';
    
    const title = document.createElement('h2');
    title.textContent = '导出数据';
    title.style.marginBottom = '10px';
    
    const instructions = document.createElement('p');
    instructions.textContent = '复制下面的数据并保存至安全位置。您可以之后通过"导入数据"功能恢复数据。';
    instructions.style.marginBottom = '10px';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style.marginTop = '10px';
    closeButton.style.padding = '8px 16px';
    closeButton.style.backgroundColor = '#3498db';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';
    
    closeButton.onclick = function() {
        document.body.removeChild(modal);
    };
    
    content.appendChild(title);
    content.appendChild(instructions);
    content.appendChild(textarea);
    content.appendChild(closeButton);
    modal.appendChild(content);
    
    document.body.appendChild(modal);
    
    // 自动选择文本
    textarea.select();
    
    // 尝试创建下载文件
    try {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        const downloadLink = document.createElement('a');
        downloadLink.textContent = '下载JSON文件';
        downloadLink.style.marginLeft = '10px';
        downloadLink.style.padding = '8px 16px';
        downloadLink.style.backgroundColor = '#2ecc71';
        downloadLink.style.color = 'white';
        downloadLink.style.border = 'none';
        downloadLink.style.borderRadius = '5px';
        downloadLink.style.cursor = 'pointer';
        downloadLink.style.textDecoration = 'none';
        
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        downloadLink.href = url;
        downloadLink.download = `allowance-data-${dateStr}.json`;
        
        content.insertBefore(downloadLink, closeButton);
    } catch (e) {
        console.error('Error creating download link:', e);
    }
}

// 显示导入对话框
function showImportDialog() {
    document.getElementById('import-dialog').style.display = 'flex';
    document.getElementById('import-data').focus();
}

// 关闭导入对话框
function closeImportDialog() {
    document.getElementById('import-dialog').style.display = 'none';
    document.getElementById('import-data').value = '';
}

// 导入数据
function importData() {
    const importText = document.getElementById('import-data').value.trim();
    
    if (!importText) {
        alert('请输入有效的JSON数据');
        return;
    }
    
    try {
        const importData = JSON.parse(importText);
        
        // 检查数据有效性
        for (const type of allowanceTypes) {
            if (!importData[type]) {
                alert(`导入数据缺少 ${typeNames[type]} 的信息`);
                return;
            }
        }
        
        // 确认导入
        if (confirm('确定要导入数据吗？这将覆盖当前所有数据。')) {
            // 导入所有数据
            for (const type of allowanceTypes) {
                saveData(type, importData[type]);
            }
            
            // 更新UI
            updateAllUI();
            
            // 关闭对话框
            closeImportDialog();
            
            alert('数据导入成功！');
        }
    } catch (e) {
        alert('导入失败：JSON格式无效');
        console.error('Import error:', e);
    }
}

// 检查是否需要月度重置
function checkMonthlyReset() {
    const now = new Date();
    const today = now.getDate();
    
    // 获取上次检查时间
    const lastCheckStr = localStorage.getItem('last-reset-check');
    
    if (lastCheckStr) {
        const lastCheck = new Date(lastCheckStr);
        const lastCheckDay = lastCheck.getDate();
        const lastCheckMonth = lastCheck.getMonth();
        const lastCheckYear = lastCheck.getFullYear();
        
        // 如果当天已经检查过，则跳过
        if (today === lastCheckDay && 
            now.getMonth() === lastCheckMonth && 
            now.getFullYear() === lastCheckYear) {
            return;
        }
    }
    
    // 如果是每月1号，执行重置
    if (today === 1) {
        autoResetTypes.forEach(type => {
            const data = loadData(type);
            if (data) {
                // 添加历史记录
                data.history.push({
                    timestamp: now.toISOString(),
                    action: 'add',
                    amount: 1,
                    reason: '每月自动增加',
                    operator: '系统'
                });
                
                // 增加1个单位额度
                data.value += 1;
                
                // 更新最后更新时间
                data.lastUpdate = now.toISOString();
                
                // 保存数据
                saveData(type, data);
            }
        });
    }
    
    // 保存本次检查时间
    localStorage.setItem('last-reset-check', now.toISOString());
}

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 加载所有数据
    loadAllData();
    
    // 设置标签切换事件
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // 恢复上次选中的标签
    const lastActiveTab = localStorage.getItem('last-active-tab');
    if (lastActiveTab && document.getElementById(lastActiveTab)) {
        switchTab(lastActiveTab);
    } else {
        // 初始化第一个标签为活动状态
        switchTab('xiaoha-allowance');
    }
    
    // 检查月度重置
    checkMonthlyReset();
    
    // 每天检查一次月度重置
    setInterval(checkMonthlyReset, 24 * 60 * 60 * 1000);
}); 