document.addEventListener('DOMContentLoaded', () => {
    // Firebase 초기화
    const firebaseConfig = {
        apiKey: "AIzaSyCwVxx0Pxd7poc_zGSp1aY9qfd89bpVUW0",
        authDomain: "finddalbong.firebaseapp.com",
        projectId: "finddalbong",
        storageBucket: "finddalbong.firebasestorage.app",
        messagingSenderId: "982765399272",
        appId: "1:982765399272:web:02344ab408272c60e2ad5d"
      };

    // Firebase 초기화
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const completionScreen = document.getElementById('completion-screen');

    const startButton = document.getElementById('start-button');
    const targetNumberContainer = document.getElementById('target-number');
    const gridContainer = document.getElementById('grid');
    const optionsContainer = document.getElementById('options');
    const submitButton = document.getElementById('submit');
    const initialButton = document.getElementById('initial-button');
    const nextButton = document.getElementById('next');
    const messageContainer = document.getElementById('message');
    const problemCounter = document.getElementById('problem-counter');
    const timerDisplay = document.getElementById('timer');
    const resultsContainer = document.getElementById('results');
    const totalTimeDisplay = document.getElementById('total-time');
    const restartButton = document.getElementById('restart-button');

    // 팝업 관련 요소
    const namePopup = document.getElementById('name-popup');
    const closeButton = document.querySelector('.close-button');
    const submitNameButton = document.getElementById('submit-name');
    const playerNameInput = document.getElementById('player-name');

    let gameData = {};
    let selectedProblems = []; // 무작위로 선택된 문제들
    let currentProblemIndex = 0;
    let selectedOptions = new Set();
    let gridState = [];
    let timer = null;
    let totalTime = 0; // 총 걸린 시간 (초)

    // Fisher-Yates 알고리즘을 사용한 배열 섞기 함수
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // 데이터 로드
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            gameData = data;
        })
        .catch(error => console.error('데이터 로드 오류:', error));

    // 시작 버튼 클릭 시 게임 시작
    startButton.addEventListener('click', () => {
        if (gameData.problems.length < 3) {
            alert('문제가 충분하지 않습니다. 최소 3개의 문제가 필요합니다.');
            return;
        }

        // 기존 타이머가 실행 중이면 정지하고 초기화
        stopTimer();
        totalTime = 0;
        timerDisplay.textContent = `시간: ${totalTime}초`;

        startScreen.style.display = 'none';
        gameScreen.style.display = 'flex';
        currentProblemIndex = 0;
        startTimer();
        selectRandomProblems(3); // 3개의 문제를 무작위로 선택
        loadProblem(currentProblemIndex);
    });

    // 제출 버튼 클릭 시 정답 확인
    submitButton.addEventListener('click', () => {
        const currentProblem = selectedProblems[currentProblemIndex];
        const targetPattern = currentProblem.targetPattern;

        if (selectedOptions.size === 0) {
            messageContainer.textContent = '선택해주세요.';
            messageContainer.style.color = 'red';
            return;
        }

        if (comparePatterns(gridState, targetPattern)) {
            messageContainer.textContent = '정답입니다!';
            messageContainer.style.color = 'green';

            // 마지막 문제인지 확인
            if (currentProblemIndex === selectedProblems.length - 1) {
                // 마지막 문제라면 이름 입력 팝업 표시
                showNamePopup();
            } else {
                // 마지막 문제가 아니라면 다음 문제로 이동할 수 있도록 'next' 버튼 표시
                submitButton.style.display = 'none';
                initialButton.style.display = 'none';
                nextButton.style.display = 'inline-block';
            }
        } else {
            messageContainer.textContent = '틀렸습니다.';
            messageContainer.style.color = 'red';
            return; // 정답이 아니면 다음 문제로 넘어가지 않음
        }
    });

    // "처음으로" 버튼 클릭 시 시작 화면으로 돌아가기
    initialButton.addEventListener('click', () => {
        // 타이머 정지 및 초기화
        stopTimer();
        totalTime = 0;
        timerDisplay.textContent = `시간: ${totalTime}초`;

        // 게임 화면과 완료 화면 숨기기
        gameScreen.style.display = 'none';
        completionScreen.style.display = 'none';

        // 시작 화면 보이기
        startScreen.style.display = 'flex';
    });

    // 다음 문제 버튼 클릭 시 다음 문제 로드
    nextButton.addEventListener('click', () => {
        currentProblemIndex++;
        if (currentProblemIndex < selectedProblems.length) {
            loadProblem(currentProblemIndex);
            messageContainer.textContent = '';
            submitButton.style.display = 'inline-block';
            initialButton.style.display = 'inline-block';
            nextButton.style.display = 'none';
        } else {
            // 모든 문제가 끝났을 때 완료 화면으로 이동
            stopTimer();
            showCompletionScreen();
        }
    });

    // 재시작 버튼 클릭 시 처음 화면으로 돌아가기
    restartButton.addEventListener('click', () => {
        // 타이머 정지 및 초기화
        stopTimer();
        totalTime = 0;
        timerDisplay.textContent = `시간: ${totalTime}초`;

        // 완료 화면 숨기기
        completionScreen.style.display = 'none';
        startScreen.style.display = 'flex';
    });

    // 무작위로 문제 선택 함수
    function selectRandomProblems(count) {
        const shuffled = shuffleArray([...gameData.problems]);
        selectedProblems = shuffled.slice(0, count);
    }

    // 문제 로드 함수
    function loadProblem(index) {
        const problem = selectedProblems[index];
        problemCounter.textContent = `문제 ${index + 1}`;
        targetNumberContainer.textContent = ''; // 텍스트 제거
        createTargetNumberGrid(problem.targetPattern);
        createGrid(problem.grid.rows, problem.grid.columns);
        createOptions(problem.options);
        selectedOptions.clear();
        messageContainer.textContent = '';
    }

    // 목표 숫자 도트 그리드 생성 함수
    function createTargetNumberGrid(targetPattern) {
        targetNumberContainer.innerHTML = ''; // 기존 내용을 지웁니다.
        targetPattern.forEach(row => {
            row.forEach(cell => {
                const dot = document.createElement('div');
                dot.classList.add('dot');
                if (cell === 1) {
                    dot.classList.add('active');
                }
                targetNumberContainer.appendChild(dot);
            });
        });
    }

    // 그리드 생성 함수
    function createGrid(rows, columns) {
        gridContainer.innerHTML = '';
        gridState = Array.from({ length: rows }, () => Array(columns).fill(0));
        for (let r = 1; r <= rows; r++) {
            for (let c = 1; c <= columns; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                gridContainer.appendChild(cell);
            }
        }
    }

    // 옵션 생성 함수 (옵션 이름 제거 및 섞기 추가)
    function createOptions(options) {
        optionsContainer.innerHTML = '';
        // 옵션 배열을 섞기
        const shuffledOptions = shuffleArray([...options]);

        shuffledOptions.forEach(option => {
            const btn = document.createElement('button');
            btn.classList.add('option');
            // btn.textContent = option.name; // 옵션 이름 제거
            btn.dataset.id = option.id;

            // 옵션 내의 작은 그리드 생성
            const optionGrid = document.createElement('div');
            optionGrid.classList.add('option-grid');
            for (let r = 1; r <= selectedProblems[currentProblemIndex].grid.rows; r++) {
                for (let c = 1; c <= selectedProblems[currentProblemIndex].grid.columns; c++) {
                    const optionCell = document.createElement('div');
                    optionCell.classList.add('option-cell');
                    if (option.cells.some(coord => coord[0] === r && coord[1] === c)) {
                        optionCell.classList.add('active');
                    }
                    optionGrid.appendChild(optionCell);
                }
            }

            btn.appendChild(optionGrid);
            btn.addEventListener('click', () => toggleOption(option.id));
            optionsContainer.appendChild(btn);
        });
    }

    // 옵션 선택/해제 함수
    function toggleOption(optionId) {
        const problem = selectedProblems[currentProblemIndex];
        const option = problem.options.find(opt => opt.id === optionId);
        const button = document.querySelector(`.option[data-id="${optionId}"]`);
        if (selectedOptions.has(optionId)) {
            selectedOptions.delete(optionId);
            button.classList.remove('selected');
            removeCells(option.cells);
        } else {
            selectedOptions.add(optionId);
            button.classList.add('selected');
            addCells(option.cells);
        }
    }

    // 셀 색칠 추가 함수
    function addCells(cells) {
        cells.forEach(coord => {
            const [row, col] = coord;
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.classList.add('active');
                gridState[row - 1][col - 1] = 1;
            }
        });
    }

    // 셀 색칠 제거 함수
    function removeCells(cells) {
        cells.forEach(coord => {
            const [row, col] = coord;
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                // 다른 선택된 옵션에 의해 색칠되었는지 확인
                let isActive = false;
                selectedProblems[currentProblemIndex].options.forEach(opt => {
                    if (selectedOptions.has(opt.id)) {
                        opt.cells.forEach(c => {
                            if (c[0] === row && c[1] === col) {
                                isActive = true;
                            }
                        });
                    }
                });
                if (!isActive) {
                    cell.classList.remove('active');
                    gridState[row - 1][col - 1] = 0;
                }
            }
        });
    }

    // 패턴 비교 함수
    function comparePatterns(current, target) {
        for (let r = 0; r < target.length; r++) {
            for (let c = 0; c < target[0].length; c++) {
                if (current[r][c] !== target[r][c]) {
                    return false;
                }
            }
        }
        return true;
    }

    // 타이머 시작 함수
    function startTimer() {
        // 기존 타이머가 실행 중이면 정지
        stopTimer();
        timer = setInterval(() => {
            totalTime++;
            timerDisplay.textContent = `시간: ${totalTime}초`;
        }, 1000);
    }

    // 타이머 정지 함수
    function stopTimer() {
        if (timer !== null) {
            clearInterval(timer);
            timer = null;
        }
    }

    // 이름 입력 팝업 표시 함수
    function showNamePopup() {
        namePopup.style.display = 'flex';
    }

    // 팝업 닫기 버튼 클릭 시
    closeButton.addEventListener('click', () => {
        namePopup.style.display = 'none';
        showCompletionScreen();
    });

    // 이름 제출 버튼 클릭 시
    submitNameButton.addEventListener('click', () => {
        const playerName = playerNameInput.value.trim();
        if (playerName === '') {
            alert('이름을 입력해주세요.');
            return;
        }

        // Firebase에 데이터 저장
        db.collection('scores').add({
            name: playerName,
            time: totalTime,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            namePopup.style.display = 'none';
            showCompletionScreen();
        })
        .catch(error => {
            console.error('데이터 저장 오류:', error);
            alert('이름을 제출하는 데 문제가 발생했습니다. 다시 시도해주세요.');
        });
    });

    // 팝업 외부 클릭 시 닫기
    window.addEventListener('click', (event) => {
        if (event.target == namePopup) {
            namePopup.style.display = 'none';
            showCompletionScreen();
        }
    });

    // 완료 화면 표시 함수
    function showCompletionScreen() {
        gameScreen.style.display = 'none';
        completionScreen.style.display = 'flex';
        displayLeaderboard();
        totalTimeDisplay.textContent = `걸린 시간: ${totalTime}초`;
    }

    // 리더보드 표시 함수
    function displayLeaderboard() {
        const leaderboardBody = document.querySelector('#leaderboard tbody');
        leaderboardBody.innerHTML = ''; // 기존 내용 제거

        // Firestore에서 상위 10개 점수 가져오기 (시간 기준 오름차순)
        db.collection('scores')
            .orderBy('time', 'asc')
            .limit(10)
            .get()
            .then((querySnapshot) => {
                let rank = 1;
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const row = document.createElement('tr');

                    const rankCell = document.createElement('td');
                    rankCell.textContent = rank;
                    row.appendChild(rankCell);

                    const nameCell = document.createElement('td');
                    nameCell.textContent = data.name;
                    row.appendChild(nameCell);

                    const timeCell = document.createElement('td');
                    timeCell.textContent = data.time;
                    row.appendChild(timeCell);

                    leaderboardBody.appendChild(row);
                    rank++;
                });

                // 만약 점수가 없으면 메시지 표시
                if (querySnapshot.empty) {
                    const row = document.createElement('tr');
                    const noDataCell = document.createElement('td');
                    noDataCell.colSpan = 3;
                    noDataCell.textContent = '아직 점수가 없습니다.';
                    row.appendChild(noDataCell);
                    leaderboardBody.appendChild(row);
                }
            })
            .catch((error) => {
                console.error('리더보드 불러오기 오류:', error);
                alert('리더보드를 불러오는 데 문제가 발생했습니다.');
            });
    }
});
