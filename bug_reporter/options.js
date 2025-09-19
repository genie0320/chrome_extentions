function saveOptions() {
	const userName = document.getElementById("userName").value;
	const userEmail = document.getElementById("userEmail").value;
	chrome.storage.sync.set(
		{
			userName: userName,
			userEmail: userEmail,
		},
		() => {
			const status = document.getElementById("status");
			status.textContent = "옵션이 저장되었습니다.";
			setTimeout(() => {
				status.textContent = "";
			}, 1500);
		}
	);
}

function restoreOptions() {
	chrome.storage.sync.get(
		{
			userName: "",
			userEmail: "",
		},
		(items) => {
			document.getElementById("userName").value = items.userName;
			document.getElementById("userEmail").value = items.userEmail;
		}
	);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("saveBtn").addEventListener("click", saveOptions);
