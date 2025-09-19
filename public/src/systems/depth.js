export function applyYDepthSort(layer) {
  if (!layer || !layer.list) return;
  layer.list.sort((a, b) => {
    const ay = a.y ?? 0;
    const by = b.y ?? 0;
    return ay - by;
  });
  layer.queueDepthSort();
}

export function setDepthByY(gameObject, offset = 0) {
  if (!gameObject) return;
  gameObject.setDepth((gameObject.y || 0) + offset);
}
