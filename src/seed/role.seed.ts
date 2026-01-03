// // seeds/role.seed.ts
// import Role from "~/models/role.model";

// export const seedRoles = async () => {
//     const roles = [
//         { code: "ADMIN", name: "Quản trị viên" },
//         { code: "USER", name: "Người dùng" },
//         { code: "SUPPORT", name: "Hỗ trợ viên" },
//     ];

//     for (const role of roles) {
//         await Role.findOneAndUpdate(
//             { code: role.code },
//             role,
//             { upsert: true }
//         );
//     }
    
//     console.log("Roles seeded successfully");
// };