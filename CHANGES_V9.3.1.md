# Version 9.3.1 - Gesture & Modal Scroll Fixes

## 🐛 Problems Fixed

### Issue 1: Modal Closes on Scroll
**Problem**: When scrolling down in settings modal, releasing touch closes the modal
**Cause**: Swipe-up gesture (dy < -50) was detecting ALL upward movements, including scrolling
**Impact**: Frustrating UX - can't scroll settings without accidentally closing

### Issue 2: Pull-to-Refresh in Modal
**Problem**: Scrolling up in modal triggers pull-to-refresh reload
**Cause**: PTR was active globally, even when modal/menu open
**Impact**: Accidental page reloads while trying to scroll modal content

---

## ✅ Solutions Implemented

### Fix 1: Smart Swipe Detection

**Before (v9.3)**:
```javascript
// Swipe up → close ANY modal
if (dy < -50) {
    document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
}
```

**After (v9.3.1)**:
```javascript
// Track where touch started
let startTarget = null;
document.addEventListener('touchstart', (e) => {
    startTarget = e.target;
});

// Swipe up → close ONLY if:
if (dy < -50) {
    const modalContent = startTarget?.closest('.modal-content');
    
    // 1. Touch started inside a modal
    if (!modalContent) return;
    
    // 2. Modal is at scroll position 0 (not scrolling content)
    if (modalContent.scrollTop > 0) return;
    
    // 3. Swipe started from TOP 100px of modal (header area)
    const modalRect = modalContent.getBoundingClientRect();
    const relativeY = startY - modalRect.top;
    
    if (relativeY < 100) {
        // OK to close - deliberate swipe from header
        activeModal.classList.remove('active');
    }
}
```

**Result**: 
- ✅ Scrolling modal content = no accidental close
- ✅ Deliberate swipe from top = closes modal
- ✅ Scrolling in middle of modal = ignored

---

### Fix 2: Context-Aware Pull-to-Refresh

**Before (v9.3)**:
```javascript
document.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
        startY = e.touches[0].clientY; // Always active
    }
});
```

**After (v9.3.1)**:
```javascript
document.addEventListener('touchstart', (e) => {
    // Check if modal or menu is open
    const modalOpen = document.querySelector('.modal.active') !== null;
    const menuOpen = document.getElementById('menuPanel')?.classList.contains('active');
    
    if (modalOpen || menuOpen) {
        startY = 0; // Disable PTR
        return;
    }
    
    if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
    }
});

document.addEventListener('touchmove', (e) => {
    // Double-check during drag
    const modalOpen = document.querySelector('.modal.active') !== null;
    const menuOpen = document.getElementById('menuPanel')?.classList.contains('active');
    
    if (modalOpen || menuOpen) {
        startY = 0;
        pulling = false;
        indicator.classList.remove('visible');
        return;
    }
    // ... continue PTR
});
```

**Result**:
- ✅ PTR disabled when modal open
- ✅ PTR disabled when menu open
- ✅ PTR only active on main game screen

---

### Fix 3: Modal Scrolling CSS

**Added**:
```css
.modal-content {
    max-height: 85vh;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;  /* Smooth iOS scrolling */
    overscroll-behavior: contain;       /* Prevent bounce to page */
}
```

**Benefits**:
- ✅ Modal scrolls smoothly on iOS
- ✅ Overscroll doesn't affect page behind
- ✅ Max height prevents modal from being taller than screen
- ✅ Auto scrollbar when content is long

---

## 🎯 Gesture Logic Flow

### Scenario 1: User scrolls settings modal down
```
1. touchstart → startTarget = (element inside modal-content)
2. touchmove → scrolling modal content
3. touchend → dy = -100 (upward)
   
   Check: Is inside modal? YES
   Check: Modal scrollTop > 0? YES (scrolling content)
   → IGNORE - don't close modal
```

### Scenario 2: User swipes from top of modal
```
1. touchstart → startTarget = (modal header area)
                relativeY = 30px from modal top
2. touchmove → quick upward swipe
3. touchend → dy = -80
   
   Check: Is inside modal? YES
   Check: Modal scrollTop > 0? NO (at top)
   Check: Started from top 100px? YES (30px)
   → CLOSE modal (deliberate close gesture)
```

### Scenario 3: User scrolls modal while menu also open
```
1. touchstart → modalOpen = true
2. Pull-to-refresh check:
   
   if (modalOpen) return; // Skip PTR entirely
   → No refresh triggered
```

---

## 📊 Detection Matrix

| User Action | Touch Start | Touch End | Result |
|-------------|-------------|-----------|--------|
| Scroll modal down | Inside modal | dy < -50 | ✅ Scroll (scrollTop > 0) |
| Scroll modal up | Inside modal | dy > 50 | ✅ Scroll |
| Swipe from modal header | Modal top 100px | dy < -50 | ✅ Close modal |
| Swipe from modal middle | Modal content | dy < -50 | ✅ Scroll, no close |
| Pull-to-refresh with modal | Modal open | dy > 60 | ✅ Ignored |
| Pull-to-refresh main screen | No modal | dy > 60 | ✅ Refresh |
| Horizontal swipe in modal | Inside modal | dx > 50 | ✅ Ignored |
| Horizontal swipe main | No modal | dx > 50 | ✅ Open menu |

---

## 🧪 Testing Checklist

### Settings Modal Scrolling
- [ ] Open Settings (18 settings, scrollable)
- [ ] Scroll down to bottom settings
- [ ] Release finger
- [ ] **Result**: Modal stays open ✅

### Modal Close Gesture
- [ ] Open Settings
- [ ] Place finger on modal title/top area
- [ ] Swipe up quickly
- [ ] **Result**: Modal closes ✅

### Pull-to-Refresh
- [ ] Open Settings modal
- [ ] Scroll to top of modal
- [ ] Pull down (refresh gesture)
- [ ] **Result**: No page reload ✅
- [ ] Close modal
- [ ] Pull down on main screen
- [ ] **Result**: Page reloads ✅

### Menu Scrolling
- [ ] Open hamburger menu
- [ ] Scroll menu items
- [ ] **Result**: No accidental actions ✅

---

## 🔧 Technical Details

### Touch Event Tracking
```javascript
// Track touch context
touchstart: {
    startX, startY,      // Position
    startTarget          // DOM element (NEW in 9.3.1)
}

// Determine action based on:
1. Touch position (inside modal?)
2. Scroll state (modalContent.scrollTop)
3. Relative position (distance from modal top)
4. Open elements (modal? menu?)
```

### CSS Properties
```css
overscroll-behavior: contain;
/* Prevents:
   - Bounce effect scrolling past content
   - Parent page scrolling when modal at limit
   - PTR triggering from modal scroll
*/

-webkit-overflow-scrolling: touch;
/* Enables:
   - Momentum scrolling on iOS
   - Smooth native-like scroll
*/
```

---

## 📦 Files Changed

### 1. index.html (v9.3.1)
**Changes**:
- `initPullToRefresh()`: Added modal/menu detection
- `initSwipeGestures()`: Smart swipe with `startTarget` tracking
- `.modal-content`: Added scroll CSS properties

**Lines changed**: ~50
**Size**: 109.5KB

### 2. sw.js (v9.3.1)
**Changes**: Cache version bump only
**Size**: 2.9KB

### 3. manifest.json (v9.3.1)
**Changes**: Version string update
**Size**: 2.3KB

### 4. version.json (v9.3.1)
**Changes**: Version and changelog
**Size**: 0.6KB

---

## 🎯 Impact

### Before (v9.3)
- ❌ Can't scroll settings without closing modal
- ❌ PTR triggers while in settings
- ❌ Frustrating mobile UX

### After (v9.3.1)
- ✅ Smooth modal scrolling
- ✅ PTR only on main screen
- ✅ Intuitive gesture behavior
- ✅ Professional mobile UX

---

## 💡 Key Insights

1. **Context Matters**: Same gesture (swipe up) means different things in different contexts
2. **Track Start Position**: Knowing WHERE touch started is crucial for smart detection
3. **Scroll State**: `scrollTop > 0` indicates user is scrolling content, not gesturing
4. **Intentional Gestures**: Swipe from header area = intentional close, from content = scrolling

---

## 🚀 Deployment

Replace 4 files:
1. **index.html** ⭐ (critical fixes)
2. **sw.js**
3. **manifest.json**
4. **version.json**

---

**Version**: 9.3.1  
**Date**: March 18, 2026  
**Bug Fixes**: 2 critical gesture issues  
**Status**: Production Ready ✅
