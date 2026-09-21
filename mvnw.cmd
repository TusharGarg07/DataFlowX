@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    https://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Maven Start Up Batch script
@REM
@REM Required ENV vars:
@REM ------------------
@REM JAVA_HOME - location of a JDK home dir
@REM
@REM Optional ENV vars
@REM -----------------
@REM MAVEN_BATCH_ECHO - set to 'on' to enable the echoing of the batch commands
@REM MAVEN_BATCH_PAUSE - set to 'on' to wait for a keystroke before ending
@REM MAVEN_OPTS - parameters passed to the Java VM when running Maven
@REM     e.g. to debug Maven itself, use
@REM set MAVEN_OPTS=-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=8000
@REM MAVEN_SKIP_RC - flag to disable loading of mavenrc files
@REM ----------------------------------------------------------------------------

@REM Begin all REM lines with '@' in case MAVEN_BATCH_ECHO is 'on'
@echo off
@REM set title of command window
title %0
@REM enable echoing by setting MAVEN_BATCH_ECHO to 'on'
@if "%MAVEN_BATCH_ECHO%" == "on"  echo %MAVEN_BATCH_ECHO%

@REM set %HOME% to equivalent of $HOME
if "%HOME%" == "" (set "HOME=%USERPROFILE%")

@REM Execute a user defined script before this one
if not "%MAVEN_SKIP_RC%" == "" goto skipRcPre
@REM check for pre script, once with genuine .bat file and once with .cmd file
if exist "%USERPROFILE%\mavenrc_pre.bat" call "%USERPROFILE%\mavenrc_pre.bat" %*
if exist "%USERPROFILE%\mavenrc_pre.cmd" call "%USERPROFILE%\mavenrc_pre.cmd" %*
:skipRcPre

@setlocal

set ERROR_CODE=0

@REM To isolate internal variables from possible post scripts, we use another setlocal
setlocal

@REM ==== START VALIDATION ====
if not "%JAVA_HOME%" == "" goto OkJHome

echo.
echo Error: JAVA_HOME is not defined correctly.
echo   We cannot execute %0
goto error

:OkJHome
if exist "%JAVA_HOME%\bin\java.exe" goto init

echo.
echo Error: JAVA_HOME is set to "%JAVA_HOME%" but java.exe was not found at that location.
echo   Please check your JAVA_HOME setting.
goto error

@REM ==== END VALIDATION ====

:init

@REM Find the project base dir, i.e. the directory that contains the folder ".mvn".
@REM Fallback to current working directory if not found.

set MAVEN_PROJECTBASEDIR=%MAVEN_BASEDIR%
if not "%MAVEN_PROJECTBASEDIR%" == "" goto resolveLocateBaseDir

if exist "%~dp0\.mvn\jvm.config" set MAVEN_PROJECTBASEDIR=%~dp0
if not "%MAVEN_PROJECTBASEDIR%" == "" goto resolveLocateBaseDir

set MAVEN_PROJECTBASEDIR=%~dp0
:resolveLocateBaseDir

if not "%MAVEN_PROJECTBASEDIR%" == "" goto endDetectBaseDir

@REM We have not determined the project base directory. Let's try to detect it by looking for the .mvn directory.
@REM If we find it, we set MAVEN_PROJECTBASEDIR to the directory containing it.
@REM If we don't find it, we set MAVEN_PROJECTBASEDIR to the current working directory.

set "MAVEN_PROJECTBASEDIR=%~dp0"
if exist "%MAVEN_PROJECTBASEDIR%\.mvn" goto endDetectBaseDir

set "MAVEN_PROJECTBASEDIR=%CD%"
:endDetectBaseDir

@REM Extend MAVEN_PROJECTBASEDIR if it is relative
if not "%MAVEN_PROJECTBASEDIR:~0,1%" == "-" goto validateBaseDir
set "MAVEN_PROJECTBASEDIR=%CD%\%MAVEN_PROJECTBASEDIR:‾1%"
:validateBaseDir

@REM If MAVEN_PROJECTBASEDIR does not exist, print an error and exit
if not exist "%MAVEN_PROJECTBASEDIR%\.mvn" goto errorBaseDir

@REM If MAVEN_PROJECTBASEDIR is not a directory, print an error and exit
if not exist "%MAVEN_PROJECTBASEDIR%\.mvn\" goto errorBaseDir

goto cmdLine

:errorBaseDir
echo.
echo Error: MAVEN_PROJECTBASEDIR is not a valid directory: %MAVEN_PROJECTBASEDIR%
echo.
goto error

:cmdLine
set MAVEN_CMD_LINE_ARGS=%*

@REM Execute the user defined initialization script before Maven starts
if not "%MAVEN_SKIP_RC%" == "" goto skipRcPost
@REM check for post script, once with genuine .bat file and once with .cmd file
if exist "%USERPROFILE%\mavenrc_post.bat" call "%USERPROFILE%\mavenrc_post.bat" %*
if exist "%USERPROFILE%\mavenrc_post.cmd" call "%USERPROFILE%\mavenrc_post.cmd" %*
:skipRcPost

@REM START MAVEN
call "%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.cmd" %MAVEN_CMD_LINE_ARGS%
if ERRORLEVEL 1 goto error
if "%MAVEN_SKIP_RC%" == "" goto end

:error
set ERROR_CODE=1

:end
@endlocal & set ERROR_CODE=%ERROR_CODE%

exit /b %ERROR_CODE%
