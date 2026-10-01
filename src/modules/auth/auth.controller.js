import * as authService from "./auth.service.js";
  
export async function login(req, res, next) {
  const { email, password } = req.body;

  const { token, employee, roles } = await authService.login(email, password);
  res
    .status(200)
    .cookie("employee_jwt", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    .json({
      message: "Logged in successfully",
      token,
      employee: {
        id: employee.id,
        roles,
        f_name: employee.f_name,
        l_name: employee.l_name,
        profile_image_url: employee.profile_image_url ?? null,
      },
    });
}

export async function getProfile(req, res) {
  const profile = await authService.getProfile(req.employee.id);
  res.status(200).json({
    success: true,
    message: "Profile retrieved successfully",
    data: profile,
  });
}

export async function logout(req, res) {
  await authService.logout(req.employee.id);

  res
    .clearCookie("employee_jwt", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    })
    .status(200)
    .json({
      success: true,
      message: "Logged out successfully",
    });
}
