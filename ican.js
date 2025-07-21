// DOM Elements
const themeToggle = document.getElementById('themeToggle');
const bandwidthToggle = document.getElementById('bandwidthToggle');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeModal = document.querySelector('.close-modal');
const screens = document.querySelectorAll('.screen');
const loginForm = document.getElementById('loginForm');
const verifyBtn = document.getElementById('verifyBtn');
const startExamBtn = document.getElementById('startExamBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const flagBtn = document.getElementById('flagBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const returnToExamBtn = document.getElementById('returnToExamBtn');
const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
const reviewExamBtn = document.getElementById('reviewExamBtn');
const exitExamBtn = document.getElementById('exitExamBtn');
const webcam = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const idUpload = document.getElementById('idUpload');
const idPreview = document.getElementById('idPreview');

// API Base URL
const API_BASE_URL = 'http://localhost:5000/api/v1';

// Global state for authentication
let authToken = null;
let currentUser = null;
let socket = null;
let currentExamSession = null;

// Initialize Socket.io connection
function initSocket() {
  socket = io('http://localhost:5000', {
    auth: {
      token: authToken
    }
  });

  socket.on('connect', () => {
    console.log('Connected to Socket.io server');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from Socket.io server');
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err);
    alert('Connection error: ' + err);
  });

  // Handle proctoring alerts (for proctors)
  socket.on('proctoringAlert', (data) => {
    console.log('Proctoring alert:', data);
    // Handle alert (e.g., show notification)
  });
}

// Initialize the application
function init() {
    // Set up event listeners
    themeToggle.addEventListener('click', toggleTheme);
    bandwidthToggle.addEventListener('click', toggleBandwidthMode);
    helpBtn.addEventListener('click', openHelpModal);
    closeModal.addEventListener('click', closeHelpModal);
    window.addEventListener('click', (e) => {
        if (e.target === helpModal) closeHelpModal();
    });
    
    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    verifyBtn.addEventListener('click', handleVerification);
    startExamBtn.addEventListener('click', startExam);
    prevBtn.addEventListener('click', prevQuestion);
    nextBtn.addEventListener('click', nextQuestion);
    flagBtn.addEventListener('click', toggleFlag);
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    returnToExamBtn.addEventListener('click', returnToExam);
    confirmSubmitBtn.addEventListener('click', submitExam);
    reviewExamBtn.addEventListener('click', reviewExam);
    exitExamBtn.addEventListener('click', exitExam);
    
    // ID Verification
    captureBtn.addEventListener('click', capturePhoto);
    idUpload.addEventListener('change', handleIdUpload);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Initialize webcam
    initWebcam();
    
    // Update timer display initially
    updateTimerDisplay();
}

// Toggle between light and dark theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Update icon
    const icon = themeToggle.querySelector('i');
    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    
    // Save preference to localStorage
    localStorage.setItem('theme', newTheme);
}

// Toggle low bandwidth mode
function toggleBandwidthMode() {
    document.body.classList.toggle('low-bandwidth');
    const isLowBandwidth = document.body.classList.contains('low-bandwidth');
    
    // Update icon
    const icon = bandwidthToggle.querySelector('i');
    icon.className = isLowBandwidth ? 'fas fa-network-wired' : 'fas fa-wifi';
    
    // Save preference to localStorage
    localStorage.setItem('lowBandwidth', isLowBandwidth);
}

// Open help modal with keyboard shortcuts
function openHelpModal() {
    helpModal.style.display = 'flex';
}

// Close help modal
function closeHelpModal() {
    helpModal.style.display = 'none';
}

// Login functionality
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Store the token and redirect
    localStorage.setItem('authToken', data.token);
    window.location.href = '/exam-instructions.html'; // Redirect after login
  } catch (err) {
    alert(err.message);
  }
});

// Modified login function
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Save token and user data
    authToken = data.token;
    currentUser = data.data.user;
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('user', JSON.stringify(currentUser));

    // Initialize Socket.io connection
    initSocket();

    // Update UI with user preferences
    if (currentUser.preferences) {
      document.documentElement.setAttribute('data-theme',
        currentUser.preferences.darkMode ? 'dark' : 'light');

      if (currentUser.preferences.lowBandwidth) {
        document.body.classList.add('low-bandwidth');
      }
    }

    // Check if ID verification is needed
    if (currentUser.idVerified) {
      navigateTo('instructionsScreen');
    } else {
      navigateTo('verificationScreen');
    }
  } catch (err) {
    alert(err.message);
  }
}

// Initialize webcam for ID verification
function initWebcam() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                webcam.srcObject = stream;
            })
            .catch(error => {
                console.error('Error accessing webcam:', error);
                // Hide webcam section if not available
                document.querySelector('.webcam-container').style.display = 'none';
                captureBtn.style.display = 'none';
            });
    } else {
        // Webcam not supported
        document.querySelector('.webcam-container').style.display = 'none';
        captureBtn.style.display = 'none';
    }
}

// Capture photo from webcam
function capturePhoto() {
    const context = canvas.getContext('2d');
    canvas.width = webcam.videoWidth;
    canvas.height = webcam.videoHeight;
    context.drawImage(webcam, 0, 0, canvas.width, canvas.height);
    
    // Show the captured image
    webcam.classList.add('d-none');
    canvas.classList.remove('d-none');
    captureBtn.textContent = 'Retake Photo';
    captureBtn.onclick = retakePhoto;
    
    // Enable verify button if ID is also uploaded
    checkVerificationComplete();
}

// Retake photo
function retakePhoto() {
    webcam.classList.remove('d-none');
    canvas.classList.add('d-none');
    captureBtn.textContent = 'Capture Photo';
    captureBtn.onclick = capturePhoto;
    verifyBtn.disabled = true;
}

// Handle ID document upload
function handleIdUpload(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.type.match('image.*')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                idPreview.innerHTML = `<img src="${event.target.result}" alt="ID Document">`;
                idPreview.style.display = 'block';
                checkVerificationComplete();
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            idPreview.innerHTML = `<div class="pdf-preview"><i class="fas fa-file-pdf"></i> ${file.name}</div>`;
            idPreview.style.display = 'block';
            checkVerificationComplete();
        } else {
            alert('Please upload an image or PDF file');
        }
    }
}

// Check if verification is complete
function checkVerificationComplete() {
    const photoTaken = !webcam.classList.contains('d-none') || !canvas.classList.contains('d-none');
    const idUploaded = idPreview.style.display === 'block';
    verifyBtn.disabled = !(photoTaken && idUploaded);
}

// Modified verification function
async function handleVerification() {
  // Convert canvas to blob
  const photoBlob = await new Promise(resolve => {
    canvas.toBlob(resolve, 'image/jpeg', 0.8);
  });

  const formData = new FormData();
  formData.append('photo', photoBlob, 'user-photo.jpg');
  formData.append('idDocument', idUpload.files[0]);

  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify-identity`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Verification failed');
    }

    // Update current user
    currentUser = data.data.user;
    localStorage.setItem('user', JSON.stringify(currentUser));

    navigateTo('instructionsScreen');
  } catch (err) {
    alert(err.message);
  }
}

// Modified start exam function
async function startExam() {
  try {
    const response = await fetch(`${API_BASE_URL}/exams/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ examId: 'default-exam-id' }) // Replace with actual exam ID
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Could not start exam');
    }

    // Save current exam session
    currentExamSession = data.data.examSession;

    // Join Socket.io room for this exam session
    socket.emit('joinExamSession', currentExamSession._id);

    examStarted = true;
    navigateTo('examScreen');

    // Start exam timer
    examTimeLeft = currentExamSession.exam.duration * 60; // Convert minutes to seconds
    updateTimerDisplay();

    examTimer = setInterval(() => {
      examTimeLeft--;
      updateTimerDisplay();

      if (examTimeLeft <= 0) {
        clearInterval(examTimer);
        submitExam();
      }
    }, 1000);
  } catch (err) {
    alert(err.message);
  }
}

// Modified save answer function
async function saveAnswer() {
  const selectedOption = document.querySelector('input[name="answer"]:checked')?.value;
  const isFlagged = flagBtn.classList.contains('flagged');

  if (!currentExamSession) return;

  try {
    // Send answer to server via Socket.io for real-time saving
    socket.emit('saveAnswer', {
      sessionId: currentExamSession._id,
      questionId: `question-${currentQuestion}`, // Replace with actual question ID from backend
      selectedOption,
      isFlagged,
      answeredAt: new Date()
    });

    // Also save via API for redundancy
    const response = await fetch(`${API_BASE_URL}/exams/sessions/${currentExamSession._id}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        questionId: `question-${currentQuestion}`,
        selectedOption,
        isFlagged
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save answer');
    }
  } catch (err) {
    console.error('Error saving answer:', err);
  }
}

// Modified submit exam function
async function submitExam() {
  if (!currentExamSession) return;

  try {
    const response = await fetch(`${API_BASE_URL}/exams/sessions/${currentExamSession._id}/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Submission failed');
    }

    clearInterval(examTimer);
    navigateTo('resultsScreen');

    // Display results
    displayExamResults(data.data.examSession, data.data.performanceBreakdown);
  } catch (err) {
    alert(err.message);
  }
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(examTimeLeft / 60);
    const seconds = examTimeLeft % 60;
    const timerText = `Time Remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Update all timer displays
    document.querySelectorAll('#examTimer').forEach(el => {
        el.textContent = timerText;
    });
}

// Navigate to a specific screen
function navigateTo(screenId) {
    // Hide current screen
    document.getElementById(currentScreen).classList.remove('active');
    
    // Show new screen
    document.getElementById(screenId).classList.add('active');
    currentScreen = screenId;
    
    // Update UI based on current screen
    if (screenId === 'examScreen') {
        updateQuestionDisplay();
    }
}

// Update question display
function updateQuestionDisplay() {
    document.getElementById('currentQuestion').textContent = `Question ${currentQuestion} of ${totalQuestions}`;
    
    // Disable previous button on first question
    prevBtn.disabled = currentQuestion === 1;
    
    // Change next button to submit on last question
    if (currentQuestion === totalQuestions) {
        nextBtn.textContent = 'Submit Exam (Ctrl+S)';
        nextBtn.onclick = navigateToSubmission;
    } else {
        nextBtn.textContent = 'Next (→)';
        nextBtn.onclick = nextQuestion;
    }
    
    // TODO: Load actual question data in a real implementation
}

// Go to previous question
function prevQuestion() {
    if (currentQuestion > 1) {
        currentQuestion--;
        updateQuestionDisplay();
    }
}

// Go to next question
function nextQuestion() {
    if (currentQuestion < totalQuestions) {
        currentQuestion++;
        updateQuestionDisplay();
    }
}

// Toggle flag for current question
function toggleFlag() {
    flagBtn.classList.toggle('flagged');
    const icon = flagBtn.querySelector('i');
    if (flagBtn.classList.contains('flagged')) {
        icon.className = 'fas fa-flag';
        flagBtn.style.color = 'var(--warning-color)';
    } else {
        icon.className = 'far fa-flag';
        flagBtn.style.color = '';
    }
}

// Toggle fullscreen mode
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Navigate to submission screen
function navigateToSubmission() {
    navigateTo('submissionScreen');
}

// Return to exam from submission screen
function returnToExam() {
    navigateTo('examScreen');
}

// Submit the exam
async function submitExam() {
  if (!currentExamSession) return;

  try {
    const response = await fetch(`${API_BASE_URL}/exams/sessions/${currentExamSession._id}/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Submission failed');
    }

    clearInterval(examTimer);
    navigateTo('resultsScreen');

    // Display results
    displayExamResults(data.data.examSession, data.data.performanceBreakdown);
  } catch (err) {
    alert(err.message);
  }
}

// New function to display exam results
function displayExamResults(examSession, breakdown) {
  document.querySelector('.score').textContent = `${Math.round(examSession.score)}%`;

  // Update performance breakdown
  const breakdownGrid = document.querySelector('.breakdown-grid');
  breakdownGrid.innerHTML = '';

  for (const [category, stats] of Object.entries(breakdown)) {
    if (stats.total > 0) {
      const percent = Math.round((stats.correct / stats.total) * 100);

      const item = document.createElement('div');
      item.className = 'breakdown-item';
      item.innerHTML = `
        <span class="breakdown-label">${category}</span>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${percent}%"></div>
        </div>
        <span class="breakdown-percent">${percent}%</span>
      `;

      breakdownGrid.appendChild(item);
    }
  }
}

// Review exam (would show answers in a real implementation)
function reviewExam() {
    alert('In a full implementation, this would show your answers and the correct solutions.');
}

// Exit exam
function exitExam() {
    // In a real app, you might navigate to a dashboard or logout
    alert('Exam completed. Thank you for using our platform.');
    navigateTo('loginScreen');
    
    // Reset exam state
    examStarted = false;
    examTimeLeft = 180 * 60;
    currentQuestion = 1;
    updateTimerDisplay();
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // Only handle shortcuts when exam is active
    if (currentScreen !== 'examScreen') return;
    
    // Prevent default for our shortcuts
    const key = e.key.toLowerCase();
    
    // Previous question (left arrow)
    if (key === 'arrowleft' && !prevBtn.disabled) {
        e.preventDefault();
        prevQuestion();
    }
    
    // Next question (right arrow)
    if (key === 'arrowright') {
        e.preventDefault();
        if (currentQuestion === totalQuestions) {
            navigateToSubmission();
        } else {
            nextQuestion();
        }
    }
    
    // Select answer (1-4)
    if (key >= '1' && key <= '4') {
        e.preventDefault();
        const optionId = `option${key}`;
        const option = document.getElementById(optionId);
        if (option) option.checked = true;
    }
    
    // Flag question (F)
    if (key === 'f') {
        e.preventDefault();
        toggleFlag();
    }
    
    // Fullscreen (F11)
    if (key === 'f11') {
        e.preventDefault();
        toggleFullscreen();
    }
    
    // Submit exam (Ctrl+S)
    if (e.ctrlKey && key === 's') {
        e.preventDefault();
        if (currentQuestion === totalQuestions) {
            navigateToSubmission();
        }
    }
    
    // Close modal (Esc)
    if (key === 'escape') {
        closeHelpModal();
    }
}

// New function to check authentication on page load
function checkAuth() {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('user');

  if (token && user) {
    authToken = token;
    currentUser = JSON.parse(user);
    initSocket();

    // Update UI with user preferences
    if (currentUser.preferences) {
      document.documentElement.setAttribute('data-theme',
        currentUser.preferences.darkMode ? 'dark' : 'light');

      if (currentUser.preferences.lowBandwidth) {
        document.body.classList.add('low-bandwidth');
      }
    }

    // Redirect based on verification status
    if (currentUser.idVerified) {
      navigateTo('instructionsScreen');
    } else {
      navigateTo('verificationScreen');
    }
  }
}

// Check for saved preferences on load
function checkPreferences() {
    // Theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        const icon = themeToggle.querySelector('i');
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    // Bandwidth preference
    const isLowBandwidth = localStorage.getItem('lowBandwidth') === 'true';
    if (isLowBandwidth) {
        document.body.classList.add('low-bandwidth');
        const icon = bandwidthToggle.querySelector('i');
        icon.className = 'fas fa-wifi';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    checkPreferences();
    checkAuth();
    init();
});