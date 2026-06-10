# Mi Vocabulario 🇪🇸

Интерактивный мобильный словарь испанского языка с тренировками и интервальным повторением (Leitner).

## Быстрый старт — деплой на GitHub Pages

### 1. Создайте репозиторий на GitHub

- Зайдите на [github.com/new](https://github.com/new)
- Назовите: `mi-vocabulario`
- **НЕ** ставьте галочки (README, .gitignore, license)
- Нажмите **Create repository**

### 2. Откройте терминал в папке проекта и выполните:

```bash
# Инициализация git
git init

# Добавить ВСЕ файлы
git add .

# Первый коммит
git commit -m "Mi Vocabulario v1.0"

# Добавить remote (замените YOUR_USERNAME на ваш логин GitHub)
git remote add origin https://github.com/YOUR_USERNAME/mi-vocabulario.git

# Запушить
git branch -M main
git push -u origin main
```

### 3. Включите GitHub Pages

1. Откройте репозиторий → **Settings** → **Pages**
2. В **Source** выберите **GitHub Actions** (не "Deploy from a branch"!)
3. Готово! Подождите 2-3 минуты

### 4. Ваш сайт будет доступен:

👉 `https://YOUR_USERNAME.github.io/mi-vocabulario/`

---

## Если нужно обновить код (очистить ветку и запушить заново)

```bash
# Удалить всё из Git (но не файлы на диске)
git rm -rf .
git clean -fd

# Добавить все файлы заново
git add .

# Коммит
git commit -m "Обновление проекта"

# Пуш (с принудительной заменой)
git push origin main --force
```

Или если хотите начать совсем с нуля:

```bash
# Полная пересборка истории (ОСТОРОЖНО — удаляет всю историю)
git checkout --orphan fresh-main
git add .
git commit -m "Mi Vocabulario v1.0 — fresh start"
git branch -D main
git branch -m main
git push -u origin main --force
```

---

## Установка как мобильное приложение (PWA)

### Android (Chrome)
1. Откройте сайт в Chrome
2. Нажмите меню (⋮) → **"Установить приложение"**
3. Готово — приложение на рабочем столе!

### iPhone (Safari)
1. Откройте сайт в Safari
2. Нажмите кнопку "Поделиться" (квадрат со стрелкой ↑)
3. Выберите **"На экран Домой"**
4. Готово!

### ПК (Chrome/Edge)
1. Откройте сайт
2. Нажмите иконку установки в адресной строке
3. Или: меню → **"Установить приложение"**

---

## Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера
npm run dev

# Сборка статического экспорта
npm run build

# Результат в папке out/
```

## Технологии

- **Next.js 16** — React-фреймворк (статический экспорт)
- **Dexie (IndexedDB)** — хранение данных в браузере
- **Zustand** — управление состоянием
- **Tailwind CSS + shadcn/ui** — UI-компоненты
- **Framer Motion** — анимации
- **PWA** — установка как приложение + работа офлайн
