# Binance WebSocket

Данный скрипт представляет собой реализацию WebSocket сервера, который доставляет данные по котировкам валютных пар на бирже Binance с USDM.

## Установка и запуск

1. Склонируйте репозиторий к себе на компьютер.
2. Установите все необходимые зависимости с помощью команды `npm install`.
3. Запустите скрипт командой `node index.js`.

## Описание работы

После запуска скрипт подключается к WebSocket серверу Binance и начинает получать данные по котировкам для всех возможных вариантов деления времени (1m, 3m, 5m, 15m, 30m, 1h, 4h, 1d).

Полученные данные сохраняются во временный буфер, и если прошло достаточно времени с момента последней отправки данных клиентам, то буфер очищается и данные отправляются всем подключенным клиентам.

Также в скрипте реализован пинг-понг механизм для поддержания активности подключения к серверу Binance.

## Используемые технологии

Для работы скрипта используются следующие библиотеки:

- `ws` - для работы с WebSocket протоколом.
- `axios` - для выполнения HTTP запросов к API Binance.
