-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 26-08-2026 a las 03:03:26
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `gym_gestion`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `duenos`
--

CREATE TABLE `duenos` (
  `id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nombre_gym` varchar(100) NOT NULL,
  `fecha_vencimiento_app` date NOT NULL DEFAULT (curdate() + interval 15 day),
  `telefono` varchar(50) DEFAULT NULL,
  `estado` varchar(20) DEFAULT 'pendiente'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `duenos`
--

INSERT INTO `duenos` (`id`, `email`, `password`, `nombre_gym`, `fecha_vencimiento_app`, `telefono`, `estado`) VALUES
(1, 'dueno1@gym.com', '123456', 'Iron Gym', '2026-09-23', NULL, 'pendiente'),
(2, 'dueno2@gym.com', '654321', 'Power Fitness', '2026-09-23', NULL, 'pendiente'),
(3, 'ayrtonrubendasilva@gmail.com', 'ayrton2008', 'Senna Gym', '2026-09-23', NULL, 'pendiente'),
(4, 'juan@gmail.com', '123456', 'musculito', '2026-08-24', NULL, 'pendiente'),
(6, 'lolo@gmail.com', '123456', 'Senna Gym', '2026-10-08', NULL, 'pendiente'),
(7, 'juands@gmail.com', '123456', 'KOKOKds', '2026-09-09', NULL, 'pendiente'),
(8, 'jota@gmail.com', '$2b$10$U0W6nYCw6.OmeQJwV7R4a.sHys3dAI.AO2CZOI.ZEi21VLejaWccS', 'JOTA', '2026-09-09', NULL, 'pendiente'),
(9, 'mati@gmail.com', '$2b$10$/GwcynSZzGkmTuekZKYsc.eFAwMQTy.cmonW2RPyHgkp.hZfm7Fdu', 'matias', '2026-09-09', NULL, 'pendiente'),
(10, 'koko@gmail.com', '$2b$10$gqgnkdWQGtq0G6eEj2ApwOLWHAnmyNoAjIDPoGFLsQFX2lKJGdvCO', 'kkkoko', '2026-09-24', NULL, 'activo');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historial_gimnasios`
--

CREATE TABLE `historial_gimnasios` (
  `id` int(11) NOT NULL,
  `dueno_id` int(11) NOT NULL,
  `tipo_evento` varchar(50) NOT NULL,
  `detalles` text DEFAULT NULL,
  `fecha_evento` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `historial_gimnasios`
--

INSERT INTO `historial_gimnasios` (`id`, `dueno_id`, `tipo_evento`, `detalles`, `fecha_evento`) VALUES
(1, 4, 'PAGO', 'asdasd', '2026-08-25 23:08:33');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos`
--

CREATE TABLE `pagos` (
  `id` int(11) NOT NULL,
  `socio_id` int(11) NOT NULL,
  `dueno_id` int(11) DEFAULT NULL,
  `fecha_pago` datetime NOT NULL DEFAULT current_timestamp(),
  `monto` decimal(12,2) NOT NULL,
  `meses` int(11) NOT NULL,
  `fecha_vencimiento` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pagos`
--

INSERT INTO `pagos` (`id`, `socio_id`, `dueno_id`, `fecha_pago`, `monto`, `meses`, `fecha_vencimiento`) VALUES
(1, 19, 7, '2026-08-25 10:59:35', 20000.00, 1, '2026-09-24'),
(2, 19, 7, '2026-08-25 11:20:49', 20000.00, 1, '2026-09-24'),
(3, 19, 7, '2026-08-25 11:28:53', 20000.00, 1, '2026-09-24'),
(4, 26, 7, '2026-08-25 11:58:53', 60000.00, 3, '2026-11-23'),
(5, 26, 7, '2026-08-25 19:18:42', 120000.00, 6, '2027-02-21'),
(6, 26, 7, '2026-08-25 19:18:52', 240000.00, 12, '2027-08-20');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `planes`
--

CREATE TABLE `planes` (
  `id` int(11) NOT NULL,
  `nombre_plan` varchar(100) NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `dueno_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `planes`
--

INSERT INTO `planes` (`id`, `nombre_plan`, `precio`, `dueno_id`) VALUES
(2, '3 dias', 20000.00, 2),
(4, '3 dias', 545.00, 4),
(7, '3 dias', 555.00, 4),
(9, '3 dias', 200.00, 6),
(10, 'full time', 23000.00, 4),
(11, '3 dias', 55555.00, 4),
(12, '3 dias', 20000.00, 7),
(13, '3 dias', 6000.00, 8);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rutinas`
--

CREATE TABLE `rutinas` (
  `id` int(11) NOT NULL,
  `socio_id` int(11) NOT NULL,
  `texto_rutina` text NOT NULL,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `rutinas`
--

INSERT INTO `rutinas` (`id`, `socio_id`, `texto_rutina`, `fecha_actualizacion`) VALUES
(1, 14, 'LUNES (Pecho y Tríceps): Banco Plano 4x10, Inclinado con mancuernas 4x12, Polea alta para tríceps 4x10 / MIÉRCOLES (Espalda y Bíceps): Polea al pecho 4x10, Remo con barra 4x12, Curl de bíceps con barra 4x10 / VIERNES (Piernas y Hombros): Sentadillas 4x10, Camilla de cuádriceps 4x12, Vuelos laterales 4x12', '2026-08-24 23:03:52'),
(4, 16, 'Lunes / \nMartes/', '2026-08-25 01:22:32'),
(5, 17, 'LUNES: Pecho y tríceps', '2026-08-25 12:54:19'),
(14, 18, 'MIÉRCOLES: Piernas\n\n\n/\n\nSÁBADO: Cardio y movilidad\n\n/\n\nJUEVES: Hombros y abdomen\n\n\n/\n\nJUEVES: Hombros y abdomen', '2026-08-25 13:53:01');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `socios`
--

CREATE TABLE `socios` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `apellido` varchar(50) NOT NULL,
  `plan_id` int(11) DEFAULT NULL,
  `dni` varchar(20) NOT NULL,
  `whatsapp` varchar(20) NOT NULL,
  `monto_cuota` decimal(10,2) NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `estado` varchar(20) DEFAULT 'Al día',
  `dueno_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `socios`
--

INSERT INTO `socios` (`id`, `nombre`, `apellido`, `plan_id`, `dni`, `whatsapp`, `monto_cuota`, `fecha_vencimiento`, `estado`, `dueno_id`) VALUES
(1, 'Juan ', 'pepe', NULL, '', '5493754410115', 20000.00, '2026-09-24', 'Al día', 1),
(2, 'Juan ', 'gogo', NULL, '', '5493754410115', 200000.00, '2026-09-24', 'Al día', 1),
(3, 'pepe', 'koko', NULL, '', '5493754415635', 20000.00, '2026-09-24', 'Al día', 1),
(7, 'Juan ', 'koko', NULL, '48652553', '5493754410115', 19998.00, '2026-08-23', 'Al día', 3),
(8, 'ruben', 'da silva', NULL, '24555363', '5493754415635', 20000.00, '2026-08-23', 'Al día', 3),
(14, 'Juan ', 'koko', 2, '24555363', '5493754415635', 20000.00, '2026-09-23', 'Al día', 2),
(15, 'Juan ', 'koko', 4, '29565953', '5493754410115', 3270.00, '2027-02-20', 'Al día', 4),
(16, 'Juan ', 'da silva', 9, '48652553', '5493754415635', 200.00, '2026-09-24', 'Al día', 6),
(17, 'franco', 'velazquez', 10, '48889709', '5493754659580', 69000.00, '2026-09-25', 'Al día', 4),
(18, 'Juan ', 'pepe', 11, '29565953', '5493754956580', 55555.00, '2026-09-25', 'Al día', 4),
(19, 'Juan ', 'Da Silva', 12, '48889709', '5493754410115', 20000.00, '2026-09-24', 'Al día', 7),
(20, 'pepe', 'koko', 12, '29565953', '5493754659580', 20000.00, '2026-08-27', 'Al día', 7),
(21, 'franco', 'koko', 12, '48652553', '5493754415635', 20000.00, '2026-09-25', 'Al día', 7),
(22, 'pepe', 'koko', 12, '48652553', '5493754659580', 20000.00, '2026-09-27', 'Al día', 7),
(23, 'nuevo', ' newww', 12, '24555363', '5493754415635', 20000.00, '2026-09-25', 'Al día', 7),
(24, 'pepe', 'velazquez', 12, '48652553', '5493754956580', 20000.00, '2026-08-27', 'Al día', 7),
(25, 'hh', 'hh', 12, '48652559', '5493754956580', 20000.00, '2026-09-25', 'Al día', 7),
(26, 'DA', 'ASD', 12, '24555363', '5493754410115', 240000.00, '2027-08-20', 'Al día', 7),
(27, 'pepe', 'da silva', 12, '48889709', '5493754410115', 20000.00, '2026-08-27', 'Al día', 7),
(28, 'asf', 'asd', 12, '48652553', '5493754410115', 20000.00, '2026-10-02', 'Al día', 7),
(29, 'Juan ', 'koko', 13, '29565953', '5493754410115', 6000.00, '2026-10-08', 'Al día', 8);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `duenos`
--
ALTER TABLE `duenos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indices de la tabla `historial_gimnasios`
--
ALTER TABLE `historial_gimnasios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `dueno_id` (`dueno_id`);

--
-- Indices de la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `planes`
--
ALTER TABLE `planes`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `rutinas`
--
ALTER TABLE `rutinas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `socio_id` (`socio_id`);

--
-- Indices de la tabla `socios`
--
ALTER TABLE `socios`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `duenos`
--
ALTER TABLE `duenos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `historial_gimnasios`
--
ALTER TABLE `historial_gimnasios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `pagos`
--
ALTER TABLE `pagos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `planes`
--
ALTER TABLE `planes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `rutinas`
--
ALTER TABLE `rutinas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `socios`
--
ALTER TABLE `socios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `historial_gimnasios`
--
ALTER TABLE `historial_gimnasios`
  ADD CONSTRAINT `historial_gimnasios_ibfk_1` FOREIGN KEY (`dueno_id`) REFERENCES `duenos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `rutinas`
--
ALTER TABLE `rutinas`
  ADD CONSTRAINT `rutinas_ibfk_1` FOREIGN KEY (`socio_id`) REFERENCES `socios` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
