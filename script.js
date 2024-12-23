document.addEventListener('DOMContentLoaded', () => {
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const completionScreen = document.getElementById('completion-screen');

    const startButton = document.getElementById('start-button');
    const targetNumberContainer = document.getElementById('target-number');
    const gridContainer = document.getElementById('grid');
    const optionsContainer = document.getElementById('options');
    const submitButton = document.getElementById('submit');
    const hintButton = document.getElementById('hint');
    const nextButton = document.getElementById('next');
    const messageContainer = document.getElementById('message');
    const problemCounter = document.getElementById('problem-counter');
    const timerDisplay = document.getElementById('timer');
    const resultsContainer = document.getElementById('results');
    const totalTimeDisplay = document.getElementById('total-time');
    const restartButton = document.getElementById('restart-button');

    let gameData = {};
    let currentProblemIndex = 0;
    let selectedOptions = new Set();
    let gridState = [];
    let timer = null;
    let totalTime = 0; // 총 걸린 시간 (초)

    // 데이터 로드
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            gameData = data;
        })
        .catch(error => console.error('데이터 로드 오류:', error));

    // 시작 버튼 클릭 시 게임 시작
    startButton.addEventListener('click', () => {
        startScreen.style.display = 'none';
        gameScreen.style.display = 'flex';
        currentProblemIndex = 0;
        totalTime = 0;
        startTimer();
        loadProblem(currentProblemIndex);
    });

    // 제출 버튼 클릭 시 정답 확인
    submitButton.addEventListener('click', () => {
        const currentProblem = gameData.problems[currentProblemIndex];
        const targetPattern = currentProblem.targetPattern;

        if (selectedOptions.size === 0) {
            messageContainer.textContent = '옵션을 선택해주세요.';
            messageContainer.style.color = 'red';
            return;
        }

        if (comparePatterns(gridState, targetPattern)) {
            messageContainer.textContent = '정답입니다!';
            messageContainer.style.color = 'green';
        } else {
            messageContainer.textContent = '틀렸습니다. 다시 시도해보세요.';
            messageContainer.style.color = 'red';
            return; // 정답이 아니면 다음 문제로 넘어가지 않음
        }

        // 제출 후 옵션 비활성화
        submitButton.style.display = 'none';
        hintButton.style.display = 'none';
        nextButton.style.display = 'inline-block';
    });

    // 힌트 버튼 클릭 시 힌트 제공
    hintButton.addEventListener('click', () => {
        const currentProblem = gameData.problems[currentProblemIndex];
        const hintOptions = currentProblem.hints;

        hintOptions.forEach(optionId => {
            if (!selectedOptions.has(optionId)) {
                toggleOption(optionId);
            }
        });

        messageContainer.textContent = '힌트를 사용했습니다!';
        messageContainer.style.color = 'blue';

        // 힌트 버튼 비활성화 (힌트를 한 번만 사용하도록 설정)
        hintButton.disabled = true;
        hintButton.style.opacity = '0.6';
        hintButton.style.cursor = 'not-allowed';
    });

    // 다음 문제 버튼 클릭 시 다음 문제 로드
    nextButton.addEventListener('click', () => {
        currentProblemIndex++;
        if (currentProblemIndex < gameData.problems.length) {
            loadProblem(currentProblemIndex);
            messageContainer.textContent = '';
            submitButton.style.display = 'inline-block';
            hintButton.style.display = 'inline-block';
            hintButton.disabled = false;
            hintButton.style.opacity = '1';
            hintButton.style.cursor = 'pointer';
            nextButton.style.display = 'none';
        } else {
            // 모든 문제가 끝났을 때 완료 화면으로 이동
            stopTimer();
            showCompletionScreen();
        }
    });

    // 재시작 버튼 클릭 시 처음 화면으로 돌아가기
    restartButton.addEventListener('click', () => {
        completionScreen.style.display = 'none';
        startScreen.style.display = 'flex';
    });

    // 문제 로드 함수
    function loadProblem(index) {
        const problem = gameData.problems[index];
        problemCounter.textContent = `문제 ${index + 1} / ${gameData.problems.length}`;
        targetNumberContainer.textContent = `목표 숫자: ${problem.targetNumber}`;
        createGrid(problem.grid.rows, problem.grid.columns);
        createOptions(problem.options);
        selectedOptions.clear();
        messageContainer.textContent = '';
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

    // 옵션 생성 함수
    function createOptions(options) {
        optionsContainer.innerHTML = '';
        options.forEach(option => {
            const btn = document.createElement('button');
            btn.classList.add('option');
            btn.textContent = option.name;
            btn.dataset.id = option.id;

            // 옵션 내의 작은 그리드 생성
            const optionGrid = document.createElement('div');
            optionGrid.classList.add('option-grid');
            for (let r = 1; r <= gameData.problems[currentProblemIndex].grid.rows; r++) {
                for (let c = 1; c <= gameData.problems[currentProblemIndex].grid.columns; c++) {
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
        const problem = gameData.problems[currentProblemIndex];
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
                gameData.problems[currentProblemIndex].options.forEach(opt => {
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
        timer = setInterval(() => {
            totalTime++;
            timerDisplay.textContent = `시간: ${totalTime}초`;
        }, 1000);
    }

    // 타이머 정지 함수
    function stopTimer() {
        clearInterval(timer);
    }

    // 완료 화면 표시 함수
    function showCompletionScreen() {
        gameScreen.style.display = 'none';
        completionScreen.style.display = 'flex';
        displayResults();
        totalTimeDisplay.textContent = `걸린 시간: ${totalTime}초`;
    }

    // 결과 표시 함수
    function displayResults() {
        resultsContainer.innerHTML = '';
        gameData.problems.forEach((problem, index) => {
            const resultItem = document.createElement('div');
            resultItem.classList.add('result-item');

            const problemTitle = document.createElement('h2');
            problemTitle.textContent = `문제 ${index + 1}: 목표 숫자 ${problem.targetNumber}`;
            resultItem.appendChild(problemTitle);

            const resultGrid = document.createElement('div');
            resultGrid.classList.add('grid');

            problem.targetPattern.forEach(row => {
                row.forEach(cell => {
                    const gridCell = document.createElement('div');
                    gridCell.classList.add('cell');
                    if (cell === 1) {
                        gridCell.classList.add('active');
                    }
                    resultGrid.appendChild(gridCell);
                });
            });

            resultItem.appendChild(resultGrid);
            resultsContainer.appendChild(resultItem);
        });
    }
});
