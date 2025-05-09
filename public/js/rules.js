document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.rules-button');
    const sections = document.querySelectorAll('.rules-section');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // 모든 버튼에서 active 클래스 제거
            buttons.forEach(btn => btn.classList.remove('active'));
            // 클릭된 버튼에 active 클래스 추가
            button.classList.add('active');

            // 모든 섹션 숨기기
            sections.forEach(section => section.classList.remove('active'));
            // 선택된 섹션 보이기
            const targetSection = document.getElementById(button.dataset.target);
            targetSection.classList.add('active');
        });
    });
});
