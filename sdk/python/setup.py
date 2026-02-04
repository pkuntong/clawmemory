from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="clawmemory",
    version="1.0.0",
    author="ClawMemory Team",
    author_email="team@clawmemory.ai",
    description="Python SDK for ClawMemory - The AI Collective Consciousness",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/pkuntong/clawmemory",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.28.0",
        "urllib3>=1.26.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.0.0",
            "mypy>=1.0.0",
            "types-requests>=2.28.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "clawmemory=clawmemory.cli:main",
        ],
    },
}
)
