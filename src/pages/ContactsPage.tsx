import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RefreshCw, X, User, Users, MessageSquare, Loader2, FolderOpen, Download, ChevronDown, MessageCircle, UserX } from 'lucide-react'
import { useChatStore } from '../stores/chatStore'
import './ContactsPage.scss'

interface ContactInfo {
    username: string
    displayName: string
    remark?: string
    nickname?: string
    avatarUrl?: string
    type: 'friend' | 'group' | 'official' | 'former_friend' | 'other'
}

function ContactsPage() {
    const [contacts, setContacts] = useState<ContactInfo[]>([])
    const [filteredContacts, setFilteredContacts] = useState<ContactInfo[]>([])
    const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(new Set())
    const [isLoading, setIsLoading] = useState(true)
    const [searchKeyword, setSearchKeyword] = useState('')
    const [contactTypes, setContactTypes] = useState({
        friends: true,
        groups: false,
        officials: false,
        deletedFriends: false
    })

    // 导出模式与查看详情
    const [exportMode, setExportMode] = useState(false)
    const [selectedContact, setSelectedContact] = useState<ContactInfo | null>(null)
    const navigate = useNavigate()
    const { setCurrentSession } = useChatStore()

    // 导出相关状态
    const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'vcf'>('json')
    const [exportAvatars, setExportAvatars] = useState(true)
    const [exportFolder, setExportFolder] = useState('')
    const [isExporting, setIsExporting] = useState(false)
    const [showFormatSelect, setShowFormatSelect] = useState(false)
    const formatDropdownRef = useRef<HTMLDivElement>(null)

    // 加载通讯录
    const loadContacts = useCallback(async () => {
        setIsLoading(true)
        try {
            const result = await window.electronAPI.chat.connect()
            if (!result.success) {
                console.error('连接失败:', result.error)
                setIsLoading(false)
                return
            }
            const contactsResult = await window.electronAPI.chat.getContacts()
            
            if (contactsResult.success && contactsResult.contacts) {
                
                

                // 获取头像URL
                const usernames = contactsResult.contacts.map((c: ContactInfo) => c.username)
                if (usernames.length > 0) {
                    const avatarResult = await window.electronAPI.chat.enrichSessionsContactInfo(usernames)
                    if (avatarResult.success && avatarResult.contacts) {
                        contactsResult.contacts.forEach((contact: ContactInfo) => {
                            const enriched = avatarResult.contacts?.[contact.username]
                            if (enriched?.avatarUrl) {
                                contact.avatarUrl = enriched.avatarUrl
                            }
                        })
                    }
                }

                setContacts(contactsResult.contacts)
                setFilteredContacts(contactsResult.contacts)
                setSelectedUsernames(new Set())
            }
        } catch (e) {
            console.error('加载通讯录失败:', e)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadContacts()
    }, [loadContacts])

    // 搜索和类型过滤
    useEffect(() => {
        let filtered = contacts

        // 类型过滤
        filtered = filtered.filter(c => {
            if (c.type === 'friend' && !contactTypes.friends) return false
            if (c.type === 'group' && !contactTypes.groups) return false
            if (c.type === 'official' && !contactTypes.officials) return false
            if (c.type === 'former_friend' && !contactTypes.deletedFriends) return false
            return true
        })

        // 关键词过滤
        if (searchKeyword.trim()) {
            const lower = searchKeyword.toLowerCase()
            filtered = filtered.filter(c =>
                c.displayName?.toLowerCase().includes(lower) ||
                c.remark?.toLowerCase().includes(lower) ||
                c.username.toLowerCase().includes(lower)
            )
        }

        setFilteredContacts(filtered)
    }, [searchKeyword, contacts, contactTypes])

    // 点击外部关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node
            if (showFormatSelect && formatDropdownRef.current && !formatDropdownRef.current.contains(target)) {
                setShowFormatSelect(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showFormatSelect])

    const selectedInFilteredCount = filteredContacts.reduce((count, contact) => {
        return selectedUsernames.has(contact.username) ? count + 1 : count
    }, 0)
    const allFilteredSelected = filteredContacts.length > 0 && selectedInFilteredCount === filteredContacts.length

    const toggleContactSelected = (username: string, checked: boolean) => {
        setSelectedUsernames(prev => {
            const next = new Set(prev)
            if (checked) {
                next.add(username)
            } else {
                next.delete(username)
            }
            return next
        })
    }

    const toggleAllFilteredSelected = (checked: boolean) => {
        setSelectedUsernames(prev => {
            const next = new Set(prev)
            filteredContacts.forEach(contact => {
                if (checked) {
                    next.add(contact.username)
                } else {
                    next.delete(contact.username)
                }
            })
            return next
        })
    }

    const getAvatarLetter = (name: string) => {
        if (!name) return '?'
        return [...name][0] || '?'
    }

    const getContactTypeIcon = (type: string) => {
        switch (type) {
            case 'friend': return <User size={14} />
            case 'group': return <Users size={14} />
            case 'official': return <MessageSquare size={14} />
            case 'former_friend': return <UserX size={14} />
            default: return <User size={14} />
        }
    }

    const getContactTypeName = (type: string) => {
        switch (type) {
            case 'friend': return '好友'
            case 'group': return '群聊'
            case 'official': return '公众号'
            case 'former_friend': return '曾经的好友'
            default: return '其他'
        }
    }

    // 选择导出文件夹
    const selectExportFolder = async () => {
        try {
            const result = await window.electronAPI.dialog.openDirectory({
                title: '选择导出位置'
            })
            if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
                setExportFolder(result.filePaths[0])
            }
        } catch (e) {
            console.error('选择文件夹失败:', e)
        }
    }

    // 开始导出
    const startExport = async () => {
        if (!exportFolder) {
            alert('请先选择导出位置')
            return
        }
        if (selectedUsernames.size === 0) {
            alert('请至少选择一个联系人')
            return
        }

        setIsExporting(true)
        try {
            const exportOptions = {
                format: exportFormat,
                exportAvatars,
                contactTypes: {
                    friends: contactTypes.friends,
                    groups: contactTypes.groups,
                    officials: contactTypes.officials
                },
                selectedUsernames: Array.from(selectedUsernames)
            }

            const result = await window.electronAPI.export.exportContacts(exportFolder, exportOptions)

            if (result.success) {
                alert(`导出成功！共导出 ${result.successCount} 个联系人`)
            } else {
                alert(`导出失败：${result.error}`)
            }
        } catch (e) {
            console.error('导出失败:', e)
            alert(`导出失败：${String(e)}`)
        } finally {
            setIsExporting(false)
        }
    }

    const exportFormatOptions = [
        { value: 'json', label: 'JSON', desc: '详细格式，包含完整联系人信息' },
        { value: 'csv', label: 'CSV (Excel)', desc: '电子表格格式，适合Excel查看' },
        { value: 'vcf', label: 'VCF (vCard)', desc: '标准名片格式，支持导入手机' }
    ]

    const getOptionLabel = (value: string) => {
        return exportFormatOptions.find(opt => opt.value === value)?.label || value
    }

    return (
        <div className="contacts-page">
            {/* 左侧：联系人列表 */}
            <div className="contacts-panel">
                <div className="panel-header">
                    <h2>通讯录</h2>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            className={`icon-btn export-mode-btn ${exportMode ? 'active' : ''}`}
                            onClick={() => { setExportMode(!exportMode); setSelectedContact(null) }}
                            title={exportMode ? '退出导出模式' : '进入导出模式'}
                        >
                            <Download size={18} />
                        </button>
                        <button className="icon-btn" onClick={loadContacts} disabled={isLoading}>
                            <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="search-bar">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="搜索联系人..."
                        value={searchKeyword}
                        onChange={e => setSearchKeyword(e.target.value)}
                    />
                    {searchKeyword && (
                        <button className="clear-btn" onClick={() => setSearchKeyword('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="type-filters">
                    <label className={`filter-chip ${contactTypes.friends ? 'active' : ''}`}>
                        <input type="checkbox" checked={contactTypes.friends} onChange={e => setContactTypes({ ...contactTypes, friends: e.target.checked })} />
                        <User size={16} /><span>好友</span>
                    </label>
                    <label className={`filter-chip ${contactTypes.groups ? 'active' : ''}`}>
                        <input type="checkbox" checked={contactTypes.groups} onChange={e => setContactTypes({ ...contactTypes, groups: e.target.checked })} />
                        <Users size={16} /><span>群聊</span>
                    </label>
                    <label className={`filter-chip ${contactTypes.officials ? 'active' : ''}`}>
                        <input type="checkbox" checked={contactTypes.officials} onChange={e => setContactTypes({ ...contactTypes, officials: e.target.checked })} />
                        <MessageSquare size={16} /><span>公众号</span>
                    </label>
                    <label className={`filter-chip ${contactTypes.deletedFriends ? 'active' : ''}`}>
                        <input type="checkbox" checked={contactTypes.deletedFriends} onChange={e => setContactTypes({ ...contactTypes, deletedFriends: e.target.checked })} />
                        <UserX size={16} /><span>曾经的好友</span>
                    </label>
                </div>

                <div className="contacts-count">
                    共 {filteredContacts.length} 个联系人
                </div>

                {exportMode && (
                    <div className="selection-toolbar">
                        <label className="checkbox-item">
                            <input
                                type="checkbox"
                                checked={allFilteredSelected}
                                onChange={e => toggleAllFilteredSelected(e.target.checked)}
                                disabled={filteredContacts.length === 0}
                            />
                            <span>全选当前筛选结果</span>
                        </label>
                        <span className="selection-count">已选 {selectedUsernames.size}（当前筛选 {selectedInFilteredCount} / {filteredContacts.length}）</span>
                    </div>
                )}

                {isLoading ? (
                    <div className="loading-state">
                        <Loader2 size={32} className="spin" />
                        <span>加载中...</span>
                    </div>
                ) : filteredContacts.length === 0 ? (
                    <div className="empty-state">
                        <span>暂无联系人</span>
                    </div>
                ) : (
                    <div className="contacts-list">
                        {filteredContacts.map(contact => {
                            const isChecked = selectedUsernames.has(contact.username)
                            const isActive = !exportMode && selectedContact?.username === contact.username
                            return (
                                <div
                                    key={contact.username}
                                    className={`contact-item ${exportMode && isChecked ? 'selected' : ''} ${isActive ? 'active' : ''}`}
                                    onClick={() => {
                                        if (exportMode) {
                                            toggleContactSelected(contact.username, !isChecked)
                                        } else {
                                            setSelectedContact(isActive ? null : contact)
                                        }
                                    }}
                                >
                                    {exportMode && (
                                        <label className="contact-select" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={e => toggleContactSelected(contact.username, e.target.checked)}
                                            />
                                        </label>
                                    )}
                                    <div className="contact-avatar">
                                        {contact.avatarUrl ? (
                                            <img src={contact.avatarUrl} alt="" />
                                        ) : (
                                            <span>{getAvatarLetter(contact.displayName)}</span>
                                        )}
                                    </div>
                                    <div className="contact-info">
                                        <div className="contact-name">{contact.displayName}</div>
                                        {contact.remark && contact.remark !== contact.displayName && (
                                            <div className="contact-remark">备注: {contact.remark}</div>
                                        )}
                                    </div>
                                    <div className={`contact-type ${contact.type}`}>
                                        {getContactTypeIcon(contact.type)}
                                        <span>{getContactTypeName(contact.type)}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* 右侧面板 */}
            {exportMode ? (
                <div className="settings-panel">
                    <div className="panel-header">
                        <h2>导出设置</h2>
                    </div>

                    <div className="settings-content">
                        <div className="setting-section">
                            <h3>导出格式</h3>
                            <div className="format-select" ref={formatDropdownRef}>
                                <button
                                    type="button"
                                    className={`select-trigger ${showFormatSelect ? 'open' : ''}`}
                                    onClick={() => setShowFormatSelect(!showFormatSelect)}
                                >
                                    <span className="select-value">{getOptionLabel(exportFormat)}</span>
                                    <ChevronDown size={16} />
                                </button>
                                {showFormatSelect && (
                                    <div className="select-dropdown">
                                        {exportFormatOptions.map(option => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className={`select-option ${exportFormat === option.value ? 'active' : ''}`}
                                                onClick={() => {
                                                    setExportFormat(option.value as 'json' | 'csv' | 'vcf')
                                                    setShowFormatSelect(false)
                                                }}
                                            >
                                                <span className="option-label">{option.label}</span>
                                                <span className="option-desc">{option.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="setting-section">
                            <h3>导出选项</h3>
                            <label className="checkbox-item">
                                <input type="checkbox" checked={exportAvatars} onChange={e => setExportAvatars(e.target.checked)} />
                                <span>导出头像</span>
                            </label>
                        </div>

                        <div className="setting-section">
                            <h3>导出位置</h3>
                            <div className="export-path-display">
                                <FolderOpen size={16} />
                                <span>{exportFolder || '未设置'}</span>
                            </div>
                            <button className="select-folder-btn" onClick={selectExportFolder}>
                                <FolderOpen size={16} />
                                <span>选择导出目录</span>
                            </button>
                        </div>
                    </div>

                    <div className="export-action">
                        <button
                            className="export-btn"
                            onClick={startExport}
                            disabled={!exportFolder || isExporting || selectedUsernames.size === 0}
                        >
                            {isExporting ? (
                                <><Loader2 size={18} className="spin" /><span>导出中...</span></>
                            ) : (
                                <><Download size={18} /><span>开始导出</span></>
                            )}
                        </button>
                    </div>
                </div>
            ) : selectedContact ? (
                <div className="settings-panel">
                    <div className="panel-header">
                        <h2>联系人详情</h2>
                    </div>
                    <div className="settings-content">
                        <div className="detail-profile">
                            <div className="detail-avatar">
                                {selectedContact.avatarUrl ? (
                                    <img src={selectedContact.avatarUrl} alt="" />
                                ) : (
                                    <span>{getAvatarLetter(selectedContact.displayName)}</span>
                                )}
                            </div>
                            <div className="detail-name">{selectedContact.displayName}</div>
                            <div className={`contact-type ${selectedContact.type}`}>
                                {getContactTypeIcon(selectedContact.type)}
                                <span>{getContactTypeName(selectedContact.type)}</span>
                            </div>
                        </div>

                        <div className="detail-info-list">
                            <div className="detail-row"><span className="detail-label">用户名</span><span className="detail-value">{selectedContact.username}</span></div>
                            <div className="detail-row"><span className="detail-label">昵称</span><span className="detail-value">{selectedContact.nickname || selectedContact.displayName}</span></div>
                            {selectedContact.remark && <div className="detail-row"><span className="detail-label">备注</span><span className="detail-value">{selectedContact.remark}</span></div>}
                            <div className="detail-row"><span className="detail-label">类型</span><span className="detail-value">{getContactTypeName(selectedContact.type)}</span></div>
                        </div>

                        <button
                            className="goto-chat-btn"
                            onClick={() => {
                                setCurrentSession(selectedContact.username)
                                navigate('/chat')
                            }}
                        >
                            <MessageCircle size={18} />
                            <span>查看聊天记录</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="settings-panel">
                    <div className="empty-detail">
                        <User size={48} />
                        <span>点击左侧联系人查看详情</span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ContactsPage
