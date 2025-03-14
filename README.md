# 家庭额度管理系统

一个简单、美观的家庭额度管理工具，用于追踪孩子的各种额度使用情况。

## 最新更新 (v2.9)

- **改进每月额度自动增加逻辑**：支持补发错过的月份额度，即使用户长时间未登录也不会错过每月额度增加
- **iOS PWA模式优化**：修复在iOS设备上添加到主屏幕后无法输入用户名和密码的问题
- **快捷清零功能**：为时长类别添加了快速清零按钮
- **代码优化**：提高系统稳定性和性能

## 以前的更新 (v2.8)

- **多用户数据共享**：所有账号现在可以访问同一个共享数据库
- **实时同步**：任何用户的更改会立即对所有用户可见
- **改进的PWA支持**：优化了在iOS主屏幕应用中的使用体验
- **清零功能**：为时长类型添加了一键清零功能

## 功能特点

- **多种额度类型管理**：
  - 小哈额度（每月自动增加1单位）
  - 小哈时长
  - 椰子额度（每月自动增加1单位）
  - 椰子时长

- **简单易用的界面**：
  - 清晰的标签页导航
  - 一目了然的余额显示
  - 详细的历史记录查看
  - 快捷操作按钮

- **数据安全存储**：
  - Firebase实时数据库
  - 用户认证保护
  - 支持数据导出和导入功能
  - 可下载JSON备份文件

- **自动化功能**：
  - 特定额度类型每月自动重置
  - 记录历史使用情况
  - 自动保存操作记录
  - 版本历史追踪

## 使用方法

1. 访问应用网址: [https://ttieli.github.io/allowance-manager/](https://ttieli.github.io/allowance-manager/)
2. 使用您的电子邮箱和密码登录
3. 选择要管理的额度类型标签
4. 使用"增加"或"使用"按钮记录操作，或使用快捷操作按钮
5. 查看历史记录了解使用情况
6. 定期使用"导出数据"功能备份数据

## 技术实现

- 前端使用HTML, CSS和JavaScript
- Firebase实时数据库和身份验证
- 响应式设计，支持手机和桌面访问
- 支持PWA（渐进式Web应用），可添加到主屏幕
- GitHub Pages托管

## 数据同步

系统使用Firebase实时数据库，支持多设备、多用户之间自动同步：

1. 所有用户访问同一共享数据集
2. 任何用户的操作会即时反映给所有登录用户
3. 无需手动导入/导出即可在设备间同步
4. 仍保留手动导出/导入功能用于数据备份

## 安全须知

为保护您的家庭数据：
- 使用强密码保护您的账户
- 避免在公共设备上保持登录状态
- 定期检查账户活动
- 请勿与家庭成员以外的人共享访问凭据

## 许可证

MIT 许可证 - 详见 LICENSE 文件 