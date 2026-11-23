
export class PasswordView {
    constructor(containerId = 'password-view') {
        this._container = document.getElementById(containerId);
    }

    render() {
        const passwordLabel = document.createElement('label');
        passwordLabel.textContent = 'Password: ';
        this._container.appendChild(passwordLabel);
        passwordLabel.htmlFor = 'password-input';

        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.id = 'password-input';
        this._container.appendChild(passwordInput);

        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        this._container.appendChild(okButton);
        okButton.type = 'button';
        okButton.addEventListener('click', () => {
            console.log('OK button clicked');
        });
    }
}