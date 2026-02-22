import React, { useState, useMemo } from 'react'
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import './JumpToDateDialog.scss'

interface JumpToDateDialogProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (date: Date) => void
    currentDate?: Date
    /** 有消息的日期集合，格式为 YYYY-MM-DD */
    messageDates?: Set<string>
    /** 是否正在加载消息日期 */
    loadingDates?: boolean
}

const JumpToDateDialog: React.FC<JumpToDateDialogProps> = ({
    isOpen,
    onClose,
    onSelect,
    currentDate = new Date(),
    messageDates,
    loadingDates = false
}) => {
    const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime())
    const [calendarDate, setCalendarDate] = useState(isValidDate(currentDate) ? new Date(currentDate) : new Date())
    const [selectedDate, setSelectedDate] = useState(new Date(currentDate))
    const [showYearMonthPicker, setShowYearMonthPicker] = useState(false)

    if (!isOpen) return null

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        return new Date(year, month, 1).getDay()
    }

    const generateCalendar = () => {
        const daysInMonth = getDaysInMonth(calendarDate)
        const firstDay = getFirstDayOfMonth(calendarDate)
        const days: (number | null)[] = []

        for (let i = 0; i < firstDay; i++) {
            days.push(null)
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i)
        }

        return days
    }

    /**
     * 判断某天是否有消息
     */
    const hasMessage = (day: number): boolean => {
        if (!messageDates || messageDates.size === 0) return true // 未加载时默认全部可点击
        const year = calendarDate.getFullYear()
        const month = calendarDate.getMonth() + 1
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return messageDates.has(dateStr)
    }

    const handleDateClick = (day: number) => {
        // 如果已加载日期数据且该日期无消息，则不可点击
        if (messageDates && messageDates.size > 0 && !hasMessage(day)) return
        const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day)
        setSelectedDate(newDate)
    }

    const handleConfirm = () => {
        onSelect(selectedDate)
        onClose()
    }

    const isToday = (day: number) => {
        const today = new Date()
        return day === today.getDate() &&
            calendarDate.getMonth() === today.getMonth() &&
            calendarDate.getFullYear() === today.getFullYear()
    }

    const isSelected = (day: number) => {
        return day === selectedDate.getDate() &&
            calendarDate.getMonth() === selectedDate.getMonth() &&
            calendarDate.getFullYear() === selectedDate.getFullYear()
    }

    /**
     * 获取某天的 CSS 类名
     */
    const getDayClassName = (day: number | null): string => {
        if (day === null) return 'day-cell empty'

        const classes = ['day-cell']
        if (isSelected(day)) classes.push('selected')
        if (isToday(day)) classes.push('today')

        // 仅在已加载消息日期数据时区分有/无消息
        if (messageDates && messageDates.size > 0) {
            if (hasMessage(day)) {
                classes.push('has-message')
            } else {
                classes.push('no-message')
            }
        }

        return classes.join(' ')
    }

    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    const days = generateCalendar()

    return (
        <div className="jump-date-overlay" onClick={onClose}>
            <div className="jump-date-modal" onClick={e => e.stopPropagation()}>
                <div className="jump-date-header">
                    <div className="title-area">
                        <CalendarIcon size={18} />
                        <h3>跳转到日期</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="calendar-view">
                    <div className="calendar-nav">
                        <button
                            className="nav-btn"
                            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="current-month clickable" onClick={() => setShowYearMonthPicker(!showYearMonthPicker)}>
                            {calendarDate.getFullYear()}年{calendarDate.getMonth() + 1}月
                        </span>
                        <button
                            className="nav-btn"
                            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {showYearMonthPicker ? (
                        <div className="year-month-picker">
                            <div className="year-selector">
                                <button className="nav-btn" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear() - 1, calendarDate.getMonth(), 1))}>
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="year-label">{calendarDate.getFullYear()}年</span>
                                <button className="nav-btn" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear() + 1, calendarDate.getMonth(), 1))}>
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                            <div className="month-grid">
                                {['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'].map((name, i) => (
                                    <button
                                        key={i}
                                        className={`month-btn ${i === calendarDate.getMonth() ? 'active' : ''}`}
                                        onClick={() => {
                                            setCalendarDate(new Date(calendarDate.getFullYear(), i, 1))
                                            setShowYearMonthPicker(false)
                                        }}
                                    >{name}</button>
                                ))}
                            </div>
                        </div>
                    ) : (
                    <div className={`calendar-grid ${loadingDates ? 'loading' : ''}`}>
                        {loadingDates && (
                            <div className="calendar-loading">
                                <Loader2 size={20} className="spin" />
                                <span>正在加载...</span>
                            </div>
                        )}
                        <div className="weekdays" style={{ visibility: loadingDates ? 'hidden' : 'visible' }}>
                            {weekdays.map(d => <div key={d} className="weekday">{d}</div>)}
                        </div>
                        <div className="days" style={{ visibility: loadingDates ? 'hidden' : 'visible' }}>
                            {days.map((day, i) => (
                                <div
                                    key={i}
                                    className={getDayClassName(day)}
                                    style={{ visibility: loadingDates ? 'hidden' : 'visible' }}
                                    onClick={() => day !== null && handleDateClick(day)}
                                >
                                    {day}
                                    {day !== null && messageDates && messageDates.size > 0 && hasMessage(day) && (
                                        <span className="message-dot" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    )}
                </div>

                <div className="quick-options">
                    <button onClick={() => {
                        const d = new Date()
                        setSelectedDate(d)
                        setCalendarDate(new Date(d))
                    }}>今天</button>
                    <button onClick={() => {
                        const d = new Date()
                        d.setDate(d.getDate() - 7)
                        setSelectedDate(d)
                        setCalendarDate(new Date(d))
                    }}>一周前</button>
                    <button onClick={() => {
                        const d = new Date()
                        d.setMonth(d.getMonth() - 1)
                        setSelectedDate(d)
                        setCalendarDate(new Date(d))
                    }}>一月前</button>
                </div>

                <div className="dialog-footer">
                    <button className="cancel-btn" onClick={onClose}>取消</button>
                    <button className="confirm-btn" onClick={handleConfirm}>跳转</button>
                </div>
            </div>
        </div>
    )
}

export default JumpToDateDialog
