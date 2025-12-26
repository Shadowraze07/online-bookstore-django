import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from store.models import Category, Book

data = {
    "Фантастика": [
        {
            "title": "Дюна",
            "author": "Фрэнк Герберт",
            "price": 850,
            "image": "https://m.media-amazon.com/images/I/41-K7-5yYpL._SX322_BO1,204,203,200_.jpg",
            "description": "Эпическая сага о песчаной планете Арракис, политических интригах и судьбе вселенной."
        },
        {
            "title": "Марсианин",
            "author": "Энди Вейер",
            "price": 600,
            "image": "https://m.media-amazon.com/images/I/517I2g+K6WL._SY344_BO1,204,203,200_.jpg",
            "description": "История выживания астронавта, оставленного на Марсе в одиночестве."
        },
        {
            "title": "451 градус по Фаренгейту",
            "author": "Рэй Брэдбери",
            "price": 450,
            "image": "https://m.media-amazon.com/images/I/41wI-t4yqnL._SY291_BO1,204,203,200_QL40_ML2_.jpg",
            "description": "Антиутопия о мире, где книги запрещены, а пожарные сжигают их."
        }
    ],
    "Детективы": [
        {
            "title": "Шерлок Холмс. Полное собрание",
            "author": "Артур Конан Дойл",
            "price": 1200,
            "image": "https://m.media-amazon.com/images/I/51r0M+3m6FL._SY344_BO1,204,203,200_.jpg",
            "description": "Классические расследования величайшего сыщика всех времен."
        },
        {
            "title": "Убийство в Восточном экспрессе",
            "author": "Агата Кристи",
            "price": 550,
            "image": "https://m.media-amazon.com/images/I/51oVTRsjcqL._SY291_BO1,204,203,200_QL40_ML2_.jpg",
            "description": "Эркюль Пуаро расследует загадочное убийство в занесенном снегом поезде."
        },
        {
            "title": "Девушка с татуировкой дракона",
            "author": "Стиг Ларссон",
            "price": 700,
            "image": "https://m.media-amazon.com/images/I/51L8+4y2qRL._SY344_BO1,204,203,200_.jpg",
            "description": "Захватывающий триллер о журналисте и хакере, расследующих исчезновение."
        }
    ],
    "Психология": [
        {
            "title": "Думай медленно... решай быстро",
            "author": "Даниэль Канеман",
            "price": 950,
            "image": "https://m.media-amazon.com/images/I/41shf1+Gv+L._SY344_BO1,204,203,200_.jpg",
            "description": "Книга нобелевского лауреата о том, как работает наше мышление и почему мы совершаем ошибки."
        },
        {
            "title": "Игры, в которые играют люди",
            "author": "Эрик Берн",
            "price": 500,
            "image": "https://m.media-amazon.com/images/I/51y-Xj-yG+L._SY344_BO1,204,203,200_.jpg",
            "description": "Культовая книга о психологии человеческих взаимоотношений."
        }
    ],
    "Классика": [
        {
            "title": "Мастер и Маргарита",
            "author": "Михаил Булгаков",
            "price": 600,
            "image": "https://m.media-amazon.com/images/I/51w9WwKjL+L._SY344_BO1,204,203,200_.jpg",
            "description": "Мистический роман о визите дьявола в Москву и трагической любви."
        },
        {
            "title": "Преступление и наказание",
            "author": "Федор Достоевский",
            "price": 550,
            "image": "https://m.media-amazon.com/images/I/41-eK8g+1LL._SY344_BO1,204,203,200_.jpg",
            "description": "Психологическая драма о преступлении студента Раскольникова."
        },
        {
            "title": "Гордость и предубеждение",
            "author": "Джейн Остин",
            "price": 480,
            "image": "https://m.media-amazon.com/images/I/41+eK8g+1LL._SY344_BO1,204,203,200_.jpg",
            "description": "Остроумный роман о нравах английского общества и любви мистера Дарси и Элизабет."
        }
    ],
    "Бизнес": [
        {
            "title": "Богатый папа, бедный папа",
            "author": "Роберт Кийосаки",
            "price": 700,
            "image": "https://m.media-amazon.com/images/I/51AHZGhzZEL._SY344_BO1,204,203,200_.jpg",
            "description": "Книга о финансовой грамотности, которая изменила жизни миллионов."
        },
        {
            "title": "Самый богатый человек в Вавилоне",
            "author": "Джордж Клейсон",
            "price": 400,
            "image": "https://m.media-amazon.com/images/I/51+GySc8ExL._SY344_BO1,204,203,200_.jpg",
            "description": "Простые и эффективные законы обращения с деньгами."
        }
    ]
}

def populate():
    print("Начинаем наполнение базы данных...")

    for cat_name, books in data.items():
        category, created = Category.objects.get_or_create(title=cat_name)
        if created:
            print(f"Создана категория: {cat_name}")
        else:
            print(f"Категория уже есть: {cat_name}")

        for book_data in books:
            book, created = Book.objects.get_or_create(
                title=book_data['title'],
                defaults={
                    'author': book_data['author'],
                    'price': book_data['price'],
                    'category': category,
                    'image': book_data['image'],
                    'description': book_data['description']
                }
            )
            if created:
                print(f"  - Добавлена книга: {book.title}")
            else:
                print(f"  - Книга уже существует: {book.title}")

    print("Готово! База данных успешно наполнена.")

if __name__ == '__main__':
    populate()