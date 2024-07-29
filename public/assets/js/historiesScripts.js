document.addEventListener('DOMContentLoaded', () => {
    const createAutobiographyButton = document.getElementById('createAutobiographyButton');
    const loadingIndicator = document.getElementById('loading-indicator'); // 로딩 인디케이터 요소 선택

    if (createAutobiographyButton) {
        createAutobiographyButton.addEventListener('click', async () => {
            // 로딩 인디케이터 표시
            loadingIndicator.style.display = 'flex';

            try {
                const response = await fetch('/create_autobiography', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    // 성공적으로 응답을 받으면 '/my_autobiography'로 리디렉션
                    window.location.href = '/my_autobiography';
                } else {
                    // 오류 처리
                    alert('Failed to create autobiography');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while creating the autobiography');
            } finally {
                // 로딩 인디케이터 숨기기
                loadingIndicator.style.display = 'none';
            }
        });
    }
});
