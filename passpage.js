function checkPassword() {
            const password = document.getElementById('password').value;
            const errorElement = document.getElementById('error');
            
            if (password === '12345') {
                window.location.href = 'admin.html';
            } else {
                errorElement.style.display = 'block';
            }
        }

        function goBack() {
            window.location.href = 'index.html';
        }

        // Обработка нажатия Enter
        document.getElementById('password').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });