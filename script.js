// 1. 변수 및 상수 설정 (기본 세팅)
const generateBtn = document.getElementById('generate');
const immediateBtn = document.getElementById('immediate-generate');
const resultDiv = document.getElementById('result');
const historyList = document.getElementById('history-list');
const dingSound = document.getElementById('dingSound'); // 효과음 소스

let intervalId = null;            // 번호가 순차적으로 나오는 타이머
let timeoutId = null;             // 마지막 정렬 애니메이션용 타이머
let currentNumbers = [];          // 현재 생성된 번호들
let sortedNumbersCache = [];      // 정렬된 번호 저장소
let historyCounter = 0;           // 기록실 번호 (1., 2. ...)
let activeRollIntervals = [];     // 공이 굴러가는 애니메이션 저장소
let isGenerating = false;         // 현재 번호 생성 중인지 확인하는 상태값

// 회차 및 날짜 계산을 위한 기준 (2026년 기준)
const BASE_ROUND = 1210;
const BASE_DATE_FOR_1210 = new Date('2026-01-31T20:00:00+09:00'); 
const MS_IN_A_WEEK = 7 * 24 * 60 * 60 * 1000; // 1주일의 밀리초

// 2. 초기화 및 화면 업데이트 함수

// 현재 회차와 추첨 날짜를 계산하고 화면(HTML)에 표시하는 함수
function updateRoundNumber() {
    const currentRoundElement = document.getElementById('currentRound');
    const currentDateElement = document.getElementById('currentDate'); 
    if (!currentRoundElement || !currentDateElement) return;

    const now = new Date();
    let roundNumber;
    let drawDate = new Date(BASE_DATE_FOR_1210);

    // 날짜를 비교해서 회차와 예정일을 계산함
    // 2026년 1월 31일 오후 8시 0분 0초가 되는 순간 else로 넘어감
    if (now.getTime() < BASE_DATE_FOR_1210.getTime()) {
        roundNumber = 1209;
        // 1월 31일 20시 전까지는 1월 31일 추첨 예정으로 표시
        drawDate = new Date(BASE_DATE_FOR_1210);
    } else {
        const diffMs = now.getTime() - BASE_DATE_FOR_1210.getTime();
        const weeksPassed = Math.floor(diffMs / MS_IN_A_WEEK);
        roundNumber = BASE_ROUND + weeksPassed;
        // 기준 시간(토요일 20시)이 지났으므로 다음 추첨일인 7일 뒤를 표시
        drawDate.setTime(BASE_DATE_FOR_1210.getTime() + ((weeksPassed + 1) * MS_IN_A_WEEK));
    }

    // HTML에 계산된 회차와 날짜(YYYY-MM-DD)를 배달
    currentRoundElement.textContent = roundNumber;
    const year = drawDate.getFullYear();
    const month = String(drawDate.getMonth() + 1).padStart(2, '0');
    const day = String(drawDate.getDate()).padStart(2, '0');
    currentDateElement.textContent = `${year}-${month}-${day}`;
}

// 번호가 나오기 전 빈 공(플레이스홀더) 6개를 만드는 함수
function initPlaceholders() {
    resultDiv.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const ball = document.createElement('div');
        ball.classList.add('ball', 'placeholder');
        resultDiv.appendChild(ball);
    }
}

// 페이지가 처음 켜질 때 실행
window.addEventListener('load', () => {
    initPlaceholders();
    updateRoundNumber();
});

// 3. 번호 생성 로직 (버튼 클릭 이벤트)

generateBtn.addEventListener('click', () => {
    if (isGenerating) return; // 이미 생성 중이면 클릭 방지
    isGenerating = true;

    if (dingSound) {
        dingSound.currentTime = 0; // 소리 처음부터 재생
        dingSound.play();
    }
    
    // 이전 실행되던 타이머들 다 끄기
    clearInterval(intervalId);
    clearTimeout(timeoutId);
    initPlaceholders();

    generateBtn.disabled = true; // 버튼 비활성화
    immediateBtn.classList.remove('hidden'); // '즉시 생성' 버튼 등장

    // 1~45 사이의 중복 없는 랜덤 번호 6개 뽑기
    const numbers = new Set();
    while (numbers.size < 6) {
        const randomNumber = Math.floor(Math.random() * 45) + 1;
        numbers.add(randomNumber);
    }
    currentNumbers = Array.from(numbers); // 원본(화면 표시용)
    sortedNumbersCache = [...currentNumbers].sort((a, b) => a - b); // 정렬(최종 결과용)

    // 공이 하나씩 순차적으로 나타나게 함 (1초 간격)
    let index = 0;
    const firstBall = resultDiv.children[index];
    rollAndDisplayNumber(firstBall, currentNumbers[index], index);
    index++;

    intervalId = setInterval(() => {
        if (index < currentNumbers.length) {
            const ball = resultDiv.children[index];
            rollAndDisplayNumber(ball, currentNumbers[index], index);
            index++;
        }
        if (index === currentNumbers.length) {
            clearInterval(intervalId);
            // 6개 다 나오면 2초 뒤에 번호를 정렬하며 마무리
            timeoutId = setTimeout(() => {
                completeGeneration(sortedNumbersCache);
            }, 2000);
        }
    }, 1000);
});

// 기다리기 싫을 때 '즉시 생성' 클릭 시 바로 결과 출력
immediateBtn.addEventListener('click', () => {
    if (!isGenerating) return;
    clearInterval(intervalId);
    clearTimeout(timeoutId);
    completeGeneration(sortedNumbersCache);
});

// 4. 애니메이션 및 마무리 함수

// 모든 애니메이션을 멈추고 버튼 상태를 되돌리는 함수
function _resetButtonsAndState() {
    clearInterval(intervalId);
    clearTimeout(timeoutId);
    generateBtn.disabled = false;
    immediateBtn.classList.add('hidden');
    isGenerating = false;
}

// 굴러가는 효과(roll)를 모두 제거
function clearAllRollingAnimations() {
    activeRollIntervals.forEach(id => { if (id) clearInterval(id); });
    activeRollIntervals = [];
}

// 최종 번호 확정 및 기록실에 추가
function completeGeneration(finalNumbers) {
    if (!isGenerating) return;
    clearAllRollingAnimations();
    displayAllBalls(finalNumbers); // 최종 번호로 공 색칠
    addHistory(finalNumbers);     // 기록실로 슝!
    _resetButtonsAndState();
}

// 공의 숫자와 색깔을 바꿔주는 함수
function updateBall(index, number) {
    const ball = resultDiv.children[index];
    if (ball) {
        ball.classList.remove('placeholder');
        ball.textContent = number;
        ball.style.backgroundColor = getBallColor(number);
        ball.style.border = 'none';
    }
}

// 모든 공을 한꺼번에 업데이트
function displayAllBalls(numbers) {
    numbers.forEach((number, index) => {
        updateBall(index, number);
    });
}

// 공 안의 숫자가 촤르르륵 바뀌는 애니메이션 효과
function rollAndDisplayNumber(ballElement, finalNumber, index) {
    if (activeRollIntervals[index]) clearInterval(activeRollIntervals[index]);

    let rollCounter = 0;
    const maxRolls = 20; // 20번 숫자가 바뀜
    const rollDuration = 40; // 바뀌는 속도

    ballElement.classList.remove('placeholder');
    ballElement.style.border = 'none';

    const rollInterval = setInterval(() => {
        if (rollCounter < maxRolls) {
            const randomNumber = Math.floor(Math.random() * 45) + 1;
            ballElement.textContent = randomNumber;
            ballElement.style.backgroundColor = getBallColor(randomNumber);
            rollCounter++;
        } else {
            clearInterval(rollInterval);
            activeRollIntervals[index] = null;
            ballElement.textContent = finalNumber;
            ballElement.style.backgroundColor = getBallColor(finalNumber);
        }
    }, rollDuration);
    activeRollIntervals[index] = rollInterval;
}

// 5. 기록실(History) 및 공 색상 규칙

// 생성된 기록을 우측 리스트에 추가하는 함수
function addHistory(numbers) {
    if (numbers.length === 0) return;

    const historyItem = document.createElement('div');
    historyItem.classList.add('history-item');

    historyCounter++;
    const historyNumberPrefix = document.createElement('div');
    historyNumberPrefix.classList.add('history-number-prefix');
    historyNumberPrefix.textContent = `${historyCounter}.`; // 몇 번째 기록인지
    historyItem.prepend(historyNumberPrefix);

    const numbersDiv = document.createElement('div');
    numbersDiv.classList.add('history-numbers');

    numbers.forEach(number => {
        const ball = document.createElement('div');
        ball.classList.add('history-ball');
        ball.textContent = number;
        ball.style.backgroundColor = getBallColor(number);
        numbersDiv.appendChild(ball);
    });

    historyItem.appendChild(numbersDiv);
    historyList.prepend(historyItem); // 최신 기록이 위로 오도록 prepend 사용
}

// 로또 공식 번호 대역별 색상 적용
function getBallColor(number) {
    if (number <= 10) return '#f2b720'; // 1~10: 노랑
    if (number <= 20) return '#4072ac'; // 11~20: 파랑
    if (number <= 30) return '#de4c0e'; // 21~30: 빨강
    if (number <= 40) return '#9195a4'; // 31~40: 회색
    return '#13be4b';                   // 41~45: 연두
}