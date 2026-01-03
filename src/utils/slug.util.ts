// utils/slug.util.ts
export const generateSlug = (text: string): string => {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")  // Bỏ dấu tiếng Việt
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^a-z0-9\s-]/g, "")     // Bỏ ký tự đặc biệt
        .replace(/\s+/g, "-")              // Thay space bằng -
        .replace(/-+/g, "-")               // Bỏ - thừa
        .trim();
};

export const generateUniqueSlug = (text: string): string => {
    const baseSlug = generateSlug(text);
    const timestamp = Date.now();
    return `${baseSlug}-${timestamp}`;
};