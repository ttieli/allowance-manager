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

// 同步状态变量
let syncStatus = 'offline';

// 用户设置
let userSettings = {
    showDetailDialog: true,  // 是否显示详细录入对话框
    autoSaveChanges: false   // 是否自动保存更改（不显示对话框）
};

// 初始化时从localStorage获取设置
function loadUserSettings() {
    const savedSettings = localStorage.getItem('allowanceManagerSettings');
    if (savedSettings) {
        try {
            userSettings = {...userSettings, ...JSON.parse(savedSettings)};
            console.log('已加载用户设置:', userSettings);
        } catch (e) {
            console.error('加载用户设置失败:', e);
        }
    }
}

// 保存用户设置到localStorage
function saveUserSettings() {
    try {
        localStorage.setItem('allowanceManagerSettings', JSON.stringify(userSettings));
    } catch (e) {
        console.error('保存用户设置失败:', e);
    }
}

// 监听在线状态
firebase.database().ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === true) {
        syncStatus = 'online';
        updateSyncUI();
    } else {
        syncStatus = 'offline';
        updateSyncUI();
    }
});

// 更新同步状态UI
function updateSyncUI() {
    const userEmail = document.getElementById('user-email');
    if (firebase.auth().currentUser) {
        userEmail.innerHTML = `${firebase.auth().currentUser.email} <span class="sync-status sync-${syncStatus}"></span>`;
    } else {
        userEmail.innerHTML = '';
    }
}

// 获取用户数据路径
function getUserDataPath() {
    const user = firebase.auth().currentUser;
    if (!user) return null;
    return `users/${user.uid}/allowance`;
}

// 加载数据
function loadAllData() {
    const userPath = getUserDataPath();
    if (!userPath) return;
    
    // 显示加载中状态
    syncStatus = 'syncing';
    updateSyncUI();
    
    // 初始化数据引用，并监听变化
    allowanceTypes.forEach(type => {
        const typeRef = database.ref(`${userPath}/${type}`);
        
        // 仅监听一次加载
        typeRef.once('value', (snapshot) => {
            const data = snapshot.val();
            
            if (!data) {
                // 初始化默认数据
                const defaultData = {
                    type: type,
                    value: type === 'xiaoha-allowance' ? 0.5 : (type === 'yezi-allowance' ? 1 : 0),
                    lastUpdate: null,
                    history: []
                };
                
                // 保存初始数据
                typeRef.set(defaultData);
            }
        }).then(() => {
            // 持续监听数据变化并更新UI
            typeRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    updateTypeUI(type, data);
                    syncStatus = 'online';
                    updateSyncUI();
                }
            });
        }).catch(error => {
            console.error(`Error loading data for ${type}:`, error);
            syncStatus = 'offline';
            updateSyncUI();
        });
    });
    
    // 检查是否需要自动增加额度
    checkMonthlyReset();
}

// 保存数据
function saveData(type, data) {
    const userPath = getUserDataPath();
    if (!userPath) return;
    
    // 设置同步状态
    syncStatus = 'syncing';
    updateSyncUI();
    
    // 保存到Firebase
    database.ref(`${userPath}/${type}`).set(data)
        .then(() => {
            syncStatus = 'online';
            updateSyncUI();
        })
        .catch(error => {
            console.error(`Error saving data for ${type}:`, error);
            alert(`保存数据失败: ${error.message}`);
            syncStatus = 'offline';
            updateSyncUI();
        });
}

// 获取特定类型的数据
function loadData(type) {
    const userPath = getUserDataPath();
    if (!userPath) return null;
    
    // 使用localStorage作为缓存，如果Firebase不可用
    try {
        const cachedData = localStorage.getItem(`allowance-${type}-cache`);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
    } catch (e) {
        console.error(`Error parsing cached data for ${type}:`, e);
    }
    
    return null;
}

// 更新所有UI
function updateAllUI() {
    // 现在由Firebase实时监听器处理，不需要手动调用
    // 但保留此函数以确保兼容性
    updateSyncUI();
}

// 更新特定类型的UI
function updateTypeUI(type, data) {
    // 缓存数据到localStorage以备离线使用
    try {
        localStorage.setItem(`allowance-${type}-cache`, JSON.stringify(data));
    } catch (e) {
        console.error(`Error caching data for ${type}:`, e);
    }
    
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

// 获取当前用户的默认操作人
function getCurrentUserOperator(email) {
    // 支持旧的调用方式（无参数）
    if (!email) {
        const user = firebase.auth().currentUser;
        if (!user) return null;
        email = user.email;
    }
    
    // 根据用户邮箱设置默认操作人
    if (email === 'ttieli@hotmail.com') {
        return '爸爸';
    } else if (email === 'betty106@hotmail.com') {
        return '妈妈';
    } else if (email === 'xiaoha2009@icloud.com') {
        return '小哈';
    } else if (email === 'yezitest@icloud.com') {
        return '椰子';
    }
    
    // 基于邮箱前缀进行猜测
    const username = email.split('@')[0].toLowerCase();
    if (username.includes('xiaoha')) {
        return '小哈';
    } else if (username.includes('yezi')) {
        return '椰子';
    } else if (username.includes('papa') || username.includes('dad') || username.includes('father')) {
        return '爸爸';
    } else if (username.includes('mama') || username.includes('mom') || username.includes('mother')) {
        return '妈妈';
    }
    
    // 默认返回null，表示没有默认操作人
    return null;
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
    
    // 根据登录用户设置默认操作人
    const operatorSelect = document.getElementById('action-operator');
    const defaultOperator = getCurrentUserOperator();
    if (defaultOperator) {
        operatorSelect.value = defaultOperator;
    } else if (type.includes('xiaoha')) {
        operatorSelect.value = '小哈';
    } else if (type.includes('yezi')) {
        operatorSelect.value = '椰子';
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
    
    if (!firebase.auth().currentUser) {
        alert('请先登录再进行操作');
        return;
    }
    
    const userPath = getUserDataPath();
    if (!userPath) {
        alert('无法获取用户数据路径');
        return;
    }
    
    // 显示同步状态
    syncStatus = 'syncing';
    updateSyncUI();
    
    // 获取最新数据
    database.ref(`${userPath}/${type}`).once('value')
        .then(snapshot => {
            const data = snapshot.val() || {
                type: type,
                value: 0,
                lastUpdate: null,
                history: []
            };
            
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
            if (!data.history) data.history = [];
            data.history.push(historyItem);
            
            // 限制历史记录最多保存50条
            if (data.history.length > 50) {
                data.history = data.history.slice(data.history.length - 50);
            }
            
            // 保存数据
            return database.ref(`${userPath}/${type}`).set(data);
        })
        .then(() => {
            // 更新同步状态
            syncStatus = 'online';
            updateSyncUI();
            
            // 关闭对话框
            closeDialog();
        })
        .catch(error => {
            console.error(`Error submitting action for ${type}:`, error);
            alert(`操作失败: ${error.message}`);
            syncStatus = 'offline';
            updateSyncUI();
        });
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
    try {
        localStorage.setItem('last-active-tab', tabId);
    } catch (e) {
        console.error('Error saving active tab:', e);
    }
}

// 导出数据
function exportData() {
    if (!firebase.auth().currentUser) {
        alert('请先登录再进行操作');
        return;
    }
    
    const userPath = getUserDataPath();
    if (!userPath) {
        alert('无法获取用户数据路径');
        return;
    }
    
    // 显示同步状态
    syncStatus = 'syncing';
    updateSyncUI();
    
    database.ref(userPath).once('value')
        .then(snapshot => {
            const exportData = snapshot.val() || {};
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
            
            // 更新同步状态
            syncStatus = 'online';
            updateSyncUI();
        })
        .catch(error => {
            console.error('Error exporting data:', error);
            alert(`导出数据失败: ${error.message}`);
            syncStatus = 'offline';
            updateSyncUI();
        });
}

// 显示导入对话框
function showImportDialog() {
    if (!firebase.auth().currentUser) {
        alert('请先登录再进行操作');
        return;
    }
    
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
    if (!firebase.auth().currentUser) {
        alert('请先登录再进行操作');
        return;
    }
    
    const userPath = getUserDataPath();
    if (!userPath) {
        alert('无法获取用户数据路径');
        return;
    }
    
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
            // 显示同步状态
            syncStatus = 'syncing';
            updateSyncUI();
            
            // 导入所有数据
            database.ref(userPath).set(importData)
                .then(() => {
                    // 更新同步状态
                    syncStatus = 'online';
                    updateSyncUI();
                    
                    // 关闭对话框
                    closeImportDialog();
                    
                    alert('数据导入成功！');
                })
                .catch(error => {
                    console.error('Error importing data:', error);
                    alert(`导入数据失败: ${error.message}`);
                    syncStatus = 'offline';
                    updateSyncUI();
                });
        }
    } catch (e) {
        alert('导入失败：JSON格式无效');
        console.error('Import error:', e);
    }
}

// 检查是否需要月度重置
function checkMonthlyReset() {
    if (!firebase.auth().currentUser) return;
    
    const userPath = getUserDataPath();
    if (!userPath) return;
    
    const now = new Date();
    const today = now.getDate();
    
    // 获取上次检查时间
    try {
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
    } catch (e) {
        console.error('Error checking last reset:', e);
    }
    
    // 如果是每月1号，执行重置
    if (today === 1) {
        autoResetTypes.forEach(type => {
            database.ref(`${userPath}/${type}`).once('value')
                .then(snapshot => {
                    const data = snapshot.val();
                    if (data) {
                        // 添加历史记录
                        if (!data.history) data.history = [];
                        
                        data.history.push({
                            timestamp: now.toISOString(),
                            action: 'add',
                            amount: 1,
                            reason: '每月自动增加',
                            operator: '系统'
                        });
                        
                        // 增加1个单位额度
                        data.value = (data.value || 0) + 1;
                        
                        // 更新最后更新时间
                        data.lastUpdate = now.toISOString();
                        
                        // 保存数据
                        return database.ref(`${userPath}/${type}`).set(data);
                    }
                })
                .catch(error => {
                    console.error(`Error in monthly reset for ${type}:`, error);
                });
        });
    }
    
    // 保存本次检查时间
    try {
        localStorage.setItem('last-reset-check', now.toISOString());
    } catch (e) {
        console.error('Error saving reset check time:', e);
    }
}

// 修改快捷操作功能
function quickAction(type, action, amount) {
    // 如果用户设置为不显示对话框，直接执行操作
    if (!userSettings.showDetailDialog) {
        // 使用自动操作流程
        performQuickActionWithoutDialog(type, action, amount);
        return;
    }
    
    const dialog = document.getElementById('quick-action-dialog');
    const title = document.getElementById('quick-dialog-title');
    const actionType = document.getElementById('quick-action-type');
    const actionCategory = document.getElementById('quick-action-category');
    const actionAmount = document.getElementById('quick-action-amount');
    
    // 设置对话框标题
    const actionText = action === 'add' ? '增加' : '使用';
    const amountText = type.includes('time') ? `${amount}分钟` : `${amount}个额度`;
    title.textContent = `${actionText} ${typeNames[type]} ${amountText}`;
    
    // 设置隐藏字段值
    actionType.value = action;
    actionCategory.value = type;
    actionAmount.value = amount;
    
    // 根据登录用户设置默认操作人
    const operatorSelect = document.getElementById('quick-action-operator');
    const defaultOperator = getCurrentUserOperator();
    if (defaultOperator) {
        operatorSelect.value = defaultOperator;
    } else if (type.includes('xiaoha')) {
        operatorSelect.value = '小哈';
    } else if (type.includes('yezi')) {
        operatorSelect.value = '椰子';
    }
    
    // 添加不再显示对话框的选项
    document.getElementById('quick-action-skip-dialog').checked = false;
    
    // 显示对话框
    dialog.style.display = 'flex';
    
    // 聚焦原因输入框，但不是必填的
    document.getElementById('quick-action-reason').focus();
}

// 添加无对话框的快捷操作函数
function performQuickActionWithoutDialog(type, action, amount) {
    if (!firebase.auth().currentUser) {
        alert('请先登录再进行操作');
        return;
    }
    
    const userPath = getUserDataPath();
    if (!userPath) {
        alert('无法获取用户数据路径');
        return;
    }
    
    // 设置默认操作人
    let operator = getCurrentUserOperator();
    if (!operator) {
        if (type.includes('xiaoha')) {
            operator = '小哈';
        } else if (type.includes('yezi')) {
            operator = '椰子';
        } else {
            operator = '系统';
        }
    }
    
    // 设置默认原因
    const actionText = action === 'add' ? '增加' : '使用';
    const amountText = type.includes('time') ? `${amount}分钟` : `${amount}个额度`;
    const reason = `快捷${actionText}${amountText}`;
    
    // 显示同步状态
    syncStatus = 'syncing';
    updateSyncUI();
    
    // 显示操作反馈
    const valueElement = document.getElementById(`${type}-value`);
    if (valueElement) {
        valueElement.classList.add('updating');
        // 过渡动画效果，表示正在更新
        setTimeout(() => valueElement.classList.remove('updating'), 1000);
    }
    
    // 获取最新数据
    database.ref(`${userPath}/${type}`).once('value')
        .then(snapshot => {
            const data = snapshot.val() || {
                type: type,
                value: 0,
                lastUpdate: null,
                history: []
            };
            
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
            if (!data.history) data.history = [];
            data.history.push(historyItem);
            
            // 限制历史记录最多保存50条
            if (data.history.length > 50) {
                data.history = data.history.slice(data.history.length - 50);
            }
            
            // 保存数据
            return database.ref(`${userPath}/${type}`).set(data);
        })
        .then(() => {
            // 更新同步状态
            syncStatus = 'online';
            updateSyncUI();
            
            // 显示临时成功消息
            showToast(`${typeNames[type]}${action === 'add' ? '增加' : '减少'}成功!`, 'success');
        })
        .catch(error => {
            console.error(`Error submitting action for ${type}:`, error);
            alert(`操作失败: ${error.message}`);
            syncStatus = 'offline';
            updateSyncUI();
            
            // 显示临时错误消息
            showToast('操作失败，请重试', 'error');
        });
}

// 修改提交快捷操作函数
function submitQuickAction() {
    const type = document.getElementById('quick-action-category').value;
    const action = document.getElementById('quick-action-type').value;
    const amount = parseFloat(document.getElementById('quick-action-amount').value);
    let reason = document.getElementById('quick-action-reason').value.trim();
    const operator = document.getElementById('quick-action-operator').value;
    const skipDialog = document.getElementById('quick-action-skip-dialog').checked;
    
    // 如果勾选了"不再显示对话框"，更新用户设置
    if (skipDialog) {
        userSettings.showDetailDialog = false;
        saveUserSettings();
        showToast('已保存设置：操作不再显示对话框', 'info');
    }
    
    if (!operator) {
        alert('请选择操作人');
        return;
    }
    
    // 如果没有填写原因，使用默认原因
    if (!reason) {
        const actionText = action === 'add' ? '增加' : '使用';
        const amountText = type.includes('time') ? `${amount}分钟` : `${amount}个额度`;
        reason = `快捷${actionText}${amountText}`;
    }
    
    if (!firebase.auth().currentUser) {
        alert('请先登录再进行操作');
        return;
    }
    
    const userPath = getUserDataPath();
    if (!userPath) {
        alert('无法获取用户数据路径');
        return;
    }
    
    // 显示同步状态
    syncStatus = 'syncing';
    updateSyncUI();
    
    // 显示操作反馈
    const valueElement = document.getElementById(`${type}-value`);
    if (valueElement) {
        valueElement.classList.add('updating');
        // 过渡动画效果，表示正在更新
        setTimeout(() => valueElement.classList.remove('updating'), 1000);
    }
    
    // 获取最新数据
    database.ref(`${userPath}/${type}`).once('value')
        .then(snapshot => {
            const data = snapshot.val() || {
                type: type,
                value: 0,
                lastUpdate: null,
                history: []
            };
            
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
            if (!data.history) data.history = [];
            data.history.push(historyItem);
            
            // 限制历史记录最多保存50条
            if (data.history.length > 50) {
                data.history = data.history.slice(data.history.length - 50);
            }
            
            // 保存数据
            return database.ref(`${userPath}/${type}`).set(data);
        })
        .then(() => {
            // 更新同步状态
            syncStatus = 'online';
            updateSyncUI();
            
            // 关闭对话框
            closeQuickDialog();
            
            // 显示临时成功消息
            showToast(`${typeNames[type]}${action === 'add' ? '增加' : '减少'}成功!`, 'success');
        })
        .catch(error => {
            console.error(`Error submitting quick action for ${type}:`, error);
            alert(`操作失败: ${error.message}`);
            syncStatus = 'offline';
            updateSyncUI();
            
            // 显示临时错误消息
            showToast('操作失败，请重试', 'error');
        });
}

// 添加设置对话框显示函数
function showSettingsDialog() {
    const dialog = document.getElementById('settings-dialog');
    const showDialogCheckbox = document.getElementById('setting-show-dialog');
    
    // 设置当前选项值
    showDialogCheckbox.checked = userSettings.showDetailDialog;
    
    // 显示对话框
    dialog.style.display = 'flex';
}

// 关闭设置对话框
function closeSettingsDialog() {
    document.getElementById('settings-dialog').style.display = 'none';
}

// 保存设置
function saveSettings() {
    // 获取设置值
    userSettings.showDetailDialog = document.getElementById('setting-show-dialog').checked;
    
    // 保存设置
    saveUserSettings();
    
    // 关闭对话框
    closeSettingsDialog();
    
    // 显示提示
    showToast('设置已保存', 'success');
}

// 添加显示临时提示消息的功能
function showToast(message, type = 'info') {
    // 检查是否已存在toast元素，如果有则移除
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 创建toast元素
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 显示toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 2秒后自动消失
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2000);
}

// 导入初始数据
function importInitialData() {
    // 检查用户登录状态
    if (!firebase.auth().currentUser) {
        alert('请先登录再进行操作');
        return;
    }
    
    // 二次确认
    if (!confirm('此操作将用初始数据覆盖当前数据，确定要继续吗？')) {
        return;
    }
    
    const userPath = getUserDataPath();
    if (!userPath) {
        alert('无法获取用户数据路径');
        return;
    }
    
    // 显示同步状态
    syncStatus = 'syncing';
    updateSyncUI();
    
    // 在GitHub Pages和本地环境下使用不同的路径
    let dataUrl;
    if (window.location.hostname.includes('github.io')) {
        // GitHub Pages环境
        const repoName = window.location.pathname.split('/')[1];
        dataUrl = `/${repoName}/initial-data.json`;
    } else {
        // 本地或其他环境
        dataUrl = './initial-data.json';
    }
    
    console.log(`尝试从以下位置加载初始数据: ${dataUrl}`);
    
    // 从initial-data.json加载初始数据
    fetch(dataUrl)
        .then(response => {
            if (!response.ok) {
                console.error(`数据加载失败，状态: ${response.status}`);
                // 尝试备用路径
                if (window.location.hostname.includes('github.io')) {
                    console.log('尝试备用路径...');
                    return fetch('./initial-data.json');
                }
                throw new Error(`无法加载初始数据文件 (状态码: ${response.status})`);
            }
            return response.json();
        })
        .then(initialData => {
            // 验证数据格式
            if (!initialData || typeof initialData !== 'object') {
                throw new Error('初始数据格式无效');
            }
            
            // 检查必要的字段
            for (const type of allowanceTypes) {
                if (!initialData[type] || typeof initialData[type] !== 'object') {
                    throw new Error(`初始数据缺少必要字段: ${type}`);
                }
            }
            
            console.log('成功加载初始数据:', initialData);
            
            // 保存到Firebase
            return database.ref(userPath).set(initialData);
        })
        .then(() => {
            alert('初始数据导入成功!');
            syncStatus = 'online';
            updateSyncUI();
            
            // 刷新页面以显示新数据
            window.location.reload();
        })
        .catch(error => {
            console.error('Error importing initial data:', error);
            
            // 检查是否是权限错误
            if (error.code === 'PERMISSION_DENIED') {
                alert('权限被拒绝: 您没有写入数据的权限，请联系管理员');
            } else if (error.name === 'SyntaxError') {
                alert('数据格式错误: 初始数据JSON格式不正确');
            } else {
                alert(`导入初始数据失败: ${error.message}\n请检查控制台获取详细信息`);
            }
            
            syncStatus = 'offline';
            updateSyncUI();
        });
}

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 加载用户设置
    loadUserSettings();
    
    // 检测是否在GitHub Pages环境运行
    const isGitHubPages = window.location.hostname.includes('github.io');
    if (isGitHubPages) {
        console.log('检测到GitHub Pages环境，应用特定配置');
        // 可在此处添加GitHub Pages特定的配置
    }
    
    // 检测浏览器
    const isFirefox = typeof InstallTrigger !== 'undefined';
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
        console.log('检测到移动设备，应用移动优化');
        document.body.classList.add('mobile-device');
        
        // 添加适合触摸的交互方式
        document.querySelectorAll('button').forEach(button => {
            button.addEventListener('touchstart', function() {
                this.classList.add('button-active');
            });
            button.addEventListener('touchend', function() {
                this.classList.remove('button-active');
            });
        });
    }
    
    // 添加初始导入按钮到数据管理区域
    const dataManagementDiv = document.querySelector('.data-management');
    if (dataManagementDiv) {
        const initButton = document.createElement('button');
        initButton.innerText = '导入初始数据';
        initButton.onclick = importInitialData;
        initButton.className = 'import-initial-data-btn';
        dataManagementDiv.appendChild(initButton);
    }
    
    // 处理各浏览器事件处理器的兼容性问题
    if (isFirefox || isSafari) {
        console.log('检测到Firefox或Safari浏览器，应用兼容模式');
        // 修复事件处理
        document.querySelectorAll('button').forEach(button => {
            const originalClick = button.onclick;
            if (originalClick) {
                button.onclick = null;
                button.addEventListener('click', originalClick);
            }
        });
    }
    
    // Firebase验证状态监听
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log(`用户已登录: ${user.email}`);
            document.getElementById('user-email').textContent = user.email;
            
            // 隐藏登录界面
            hideLoginUI();
            
            // 加载数据
            loadAllData();
            
            // 设置当前用户的操作人默认值
            setOperatorDefaultByEmail(user.email);
        } else {
            console.log('用户未登录');
            // 显示登录界面
            showLoginUI();
        }
    });
    
    // 设置标签切换事件
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // 恢复上次选中的标签
    try {
        const lastActiveTab = localStorage.getItem('last-active-tab');
        if (lastActiveTab && document.getElementById(lastActiveTab)) {
            switchTab(lastActiveTab);
        } else {
            // 初始化第一个标签为活动状态
            switchTab('xiaoha-allowance');
        }
    } catch (e) {
        console.error('Error loading active tab:', e);
        switchTab('xiaoha-allowance');
    }
    
    // 每天检查一次月度重置
    setInterval(checkMonthlyReset, 24 * 60 * 60 * 1000);
});

// 根据邮箱设置操作人默认值
function setOperatorDefaultByEmail(email) {
    if (!email) return;
    
    const operatorSelect = document.getElementById('action-operator');
    const quickOperatorSelect = document.getElementById('quick-action-operator');
    
    if (!operatorSelect || !quickOperatorSelect) return;
    
    let defaultOperator = getCurrentUserOperator(email);
    
    if (defaultOperator) {
        for (let select of [operatorSelect, quickOperatorSelect]) {
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === defaultOperator) {
                    select.selectedIndex = i;
                    break;
                }
            }
        }
    }
}

// 关闭快捷对话框
function closeQuickDialog() {
    document.getElementById('quick-action-dialog').style.display = 'none';
    document.getElementById('quick-action-form').reset();
} 