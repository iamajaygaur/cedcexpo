export type ActionResult = {
  ok: boolean;
  message?: string;
};

export function actionOk(message?: string): ActionResult {
  return { ok: true, message };
}

export function actionFail(message: string): ActionResult {
  return { ok: false, message };
}
