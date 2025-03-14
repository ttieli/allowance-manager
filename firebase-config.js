// Firebase配置
const firebaseConfig = {
    apiKey: "AIzaSyB_QlrUwZrm2EQzsojBQSNgpMlzyDWN8bA",
    authDomain: "family-allowance-manager-3697b.firebaseapp.com",
    databaseURL: "https://family-allowance-manager-3697b-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "family-allowance-manager-3697b",
    storageBucket: "family-allowance-manager-3697b.firebasestorage.app",
    messagingSenderId: "188011361683",
    appId: "1:188011361683:web:d25f4463056cd967606466"
};

// 标记Firebase状态
let firebaseInitialized = false;

// 声明全局数据库变量，这样其他脚本可以访问
window.database = null;

try {
    // 初始化Firebase
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase初始化成功');
    firebaseInitialized = true;
    
    // 获取数据库引用并设置为全局变量
    window.database = firebase.database();
    
    // 测试数据库连接
    window.database.ref('.info/connected').once('value')
        .then(snapshot => {
            const connected = snapshot.val();
            console.log('Firebase数据库连接状态:', connected ? '已连接' : '未连接');
        })
        .catch(error => {
            console.error('Firebase数据库连接检查失败:', error);
        });
} catch (error) {
    console.error('Firebase初始化错误:', error);
    // 在页面上显示错误
    document.addEventListener('DOMContentLoaded', function() {
        const authBox = document.querySelector('.auth-box');
        if (authBox) {
            const errorMsg = document.createElement('div');
            errorMsg.style.color = 'red';
            errorMsg.style.marginTop = '10px';
            errorMsg.textContent = '系统错误: Firebase服务无法初始化，请刷新页面或联系管理员';
            authBox.appendChild(errorMsg);
        }
    });
}

// 身份验证状态监听
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        // 用户已登录
        console.log("已登录用户: " + user.email);
        // 显示用户邮箱
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) {
            userEmailElement.textContent = user.email;
        }
        // 隐藏登录界面
        hideLoginUI();
        // 加载数据
        if (typeof loadAllData === 'function') {
            loadAllData();
        }
    } else {
        // 用户未登录，显示登录界面
        showLoginUI();
    }
});

// 显示登录界面
function showLoginUI() {
    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
        authContainer.style.display = 'flex';
    }
}

// 隐藏登录界面
function hideLoginUI() {
    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
        authContainer.style.display = 'none';
    }
}

// 在文档加载完成后添加iOS PWA输入修复
document.addEventListener('DOMContentLoaded', function() {
    // 检测是否是iOS设备
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // 检测是否是PWA模式
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  window.navigator.standalone || 
                  document.referrer.includes('ios-app://');
    
    // 如果是iOS PWA模式，添加特殊处理
    if (isIOS && isPWA) {
        console.log('检测到iOS PWA模式，应用特殊处理');
        
        // 获取输入字段
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        
        // 添加聚焦事件处理
        [emailInput, passwordInput].forEach(input => {
            if (!input) return;
            
            // 聚焦时滚动到视图中心
            input.addEventListener('focus', function() {
                // 延迟执行以确保键盘已弹出
                setTimeout(() => {
                    // 滚动到输入框位置
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            });
            
            // 失焦时恢复
            input.addEventListener('blur', function() {
                // 延迟执行以确保键盘已收起
                setTimeout(() => {
                    window.scrollTo(0, 0);
                }, 300);
            });
        });
        
        // 使用表单提交而不是点击事件
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', function(event) {
                event.preventDefault();
                loginWithEmailPassword();
            });
        }
    }
});

// 登录函数
function loginWithEmailPassword() {
    // 清除之前的错误信息
    clearLoginError();
    
    // 获取输入值
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // 检查输入是否存在
    console.log('检查输入字段:', email ? '邮箱已输入' : '邮箱为空', password ? '密码已输入' : '密码为空');
    
    // 检查Firebase初始化状态
    if (!firebaseInitialized) {
        showLoginError('Firebase服务未初始化，请刷新页面或联系管理员');
        console.error('尝试登录，但Firebase未初始化');
        return;
    }
    
    // 检查网络状态
    if (!navigator.onLine) {
        showLoginError('网络连接失败，请检查您的网络后重试');
        return;
    }
    
    // 基本验证
    if (!email || !password) {
        showLoginError('请输入邮箱和密码');
        return;
    }
    
    // 显示登录中状态
    const loginButton = document.querySelector('.auth-form button');
    const originalText = loginButton.innerText;
    loginButton.innerText = '登录中...';
    loginButton.disabled = true;
    
    console.log('开始尝试登录，邮箱:', email);
    
    // 尝试登录
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // 登录成功
            console.log('登录成功:', userCredential.user.email);
            hideLoginUI();
        })
        .catch((error) => {
            // 登录失败，提供更具体的错误信息
            console.error("登录错误:", error.code, error.message);
            
            // 根据错误类型显示不同提示
            if (error.code === 'auth/invalid-email') {
                showLoginError('邮箱格式不正确，请检查后重试');
            } else if (error.code === 'auth/user-not-found') {
                showLoginError('该邮箱未注册，请检查或联系管理员');
            } else if (error.code === 'auth/wrong-password') {
                showLoginError('密码错误，请重试');
            } else if (error.code === 'auth/too-many-requests') {
                showLoginError('登录尝试次数过多，请稍后再试');
            } else if (error.code === 'auth/network-request-failed') {
                showLoginError('网络请求失败，请检查网络连接后重试');
            } else {
                showLoginError(`登录失败: ${error.message}`);
            }
        })
        .finally(() => {
            // 恢复按钮状态
            loginButton.innerText = originalText;
            loginButton.disabled = false;
        });
}

// 显示登录错误信息
function showLoginError(message) {
    const errorElement = document.getElementById('login-error');
    if (!errorElement) {
        // 如果错误元素不存在，创建一个
        const authForm = document.querySelector('.auth-form');
        const newErrorElement = document.createElement('div');
        newErrorElement.id = 'login-error';
        newErrorElement.className = 'login-error';
        newErrorElement.textContent = message;
        // 添加样式
        newErrorElement.style.color = '#E74C3C';
        newErrorElement.style.marginBottom = '16px';
        newErrorElement.style.textAlign = 'center';
        newErrorElement.style.padding = '8px';
        newErrorElement.style.borderRadius = '4px';
        newErrorElement.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
        newErrorElement.style.fontSize = '14px';
        // 插入到表单前面
        authForm.insertBefore(newErrorElement, authForm.firstChild);
    } else {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// 清除登录错误信息
function clearLoginError() {
    const errorElement = document.getElementById('login-error');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// 退出登录
function logout() {
    firebase.auth().signOut()
        .then(() => {
            // 退出成功
            showLoginUI();
        })
        .catch((error) => {
            console.error("退出登录错误:", error);
        });
} 