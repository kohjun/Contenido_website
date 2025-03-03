document.addEventListener('DOMContentLoaded', async () => {
    try {
        // user/info로 인증 확인 (쿠키의 jwt 토큰은 자동으로 전송됨)
        const userResponse = await fetch('/user/info');

        if (!userResponse.ok) {
            window.location.href = '/auth/kakao';
            return;
        }

        // 인증된 사용자의 지원 결과 조회 (쿠키의 jwt 토큰은 자동으로 전송됨)
        const resultResponse = await fetch('/application-result/result');
        const data = await resultResponse.json();

        const resultDisplay = document.getElementById('result-display');
        const errorMessage = document.getElementById('error-message');
        const resultStatus = document.getElementById('result-status');
        const resultMessage = document.getElementById('result-message');
        const kakaoLink = document.getElementById('kakao-link');

        if (resultResponse.ok) {
            errorMessage.classList.add('hidden');
            resultDisplay.classList.remove('hidden');

            let statusText = '';
            let messageText = '';
            
            switch(data.status) {
                case 'ACCEPTED':
                    statusText = '🎉 합격 🎉';
                    messageText = '축하드립니다! 아래 카카오톡 채팅방에 입장하여 추가 안내사항을 확인해주세요.';
                    kakaoLink.classList.remove('hidden');
                    document.getElementById('join-kakao').onclick = () => {
                        window.location.href = data.kakaoUrl;
                    };
                    break;
                case 'REJECTED':
                    statusText = '불합격';
                    messageText = '아쉽게도 이번에는 함께하지 못하게 되었습니다. 다음 기회에 다시 지원해주세요.';
                    kakaoLink.classList.add('hidden');
                    break;
                case 'PENDING':
                    statusText = '심사중';
                    messageText = '현재 지원서를 검토중입니다. 합격발표일을 확인해주세요.';
                    kakaoLink.classList.add('hidden');
                    break;
            }

            resultStatus.textContent = statusText;
            resultMessage.textContent = messageText;
        } else {
            resultDisplay.classList.add('hidden');
            errorMessage.classList.remove('hidden');
            errorMessage.querySelector('p').textContent = data.error || '결과 확인 중 오류가 발생했습니다.';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('결과 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
});
