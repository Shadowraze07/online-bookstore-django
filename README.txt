ИНСТРУКЦИЯ ПО ЗАПУСКУ ПРОЕКТА "ONLINE BOOKSTORE"

Автор: [Иминов Мустафа]

Требования: Python 3.10 или выше.

ШАГ 1. УСТАНОВКА
1. Распакуйте архив с проектом.
2. Откройте терминал в папке проекта.
3. Создайте виртуальное окружение:
   python -m venv venv

4. Активируйте окружение:
   Windows: venv\Scripts\activate
   Mac/Linux: source venv/bin/activate

5. Установите зависимости:
   pip install -r requirements.txt

ШАГ 2. ЗАПУСК
1. Выполните миграции (если базы данных нет):
   python manage.py migrate

2. (Опционально) Заполните базу тестовыми книгами:
   python populate_db.py

3. Запустите сервер:
   python manage.py runserver

4. Откройте в браузере:
   http://127.0.0.1:8000/

ДАННЫЕ ДЛЯ ВХОДА (АДМИН):
Логин: admin
Пароль: