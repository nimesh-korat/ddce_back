export const getCookie = (name) => {
    const cookieArr = document.cookie.split(";");
    for (let cookie of cookieArr) {
        const [key, value] = cookie.trim().split("=");
        if (key === name) {
            return value;
        }
    }
    return null;
};